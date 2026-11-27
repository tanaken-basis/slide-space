import { transformSelectedStrokes, selectedStrokeCenter, dragTransform } from "./strokeOperations.js";
import { translateSelectedStrokes, copySelectedStrokes, pasteStrokes } from './strokeClipboard.js';
import { findNearestStroke, withoutStroke, withStrokeStyle, erasePolylineAt } from './strokeOperations.js';
// Drawing state and rendering are owned by one controller.
export const createDrawingController = function ({
  neonDrawingCanvas,
  standardDrawingCanvas,
  neonDrawingCtx,
  standardDrawingCtx,
  drawingButton,
  drawingStatus,
  layerSwitch,
  layerSwitchLabel,
  colorOptions,
  lineWidthOptions,
  fadeTimeInput,
  clearDrawingsButton,
  getPointerPos,
  applyButtonEffect,
  safePlayButtonAudio,
  detachCameraControl,
  isCameraControlViaMouse,
  slideDrawing,
  drawingTargetSelect,
  getSlideTool = () => "brush",
  getStrokeColor = () => currentColor,
  getDragMode = () => "move",
  getEraserMode = () => "stroke",
  getEraserRadius = () => 12,
  onScreenSelectionChanged = () => {},
  onScreenHistory = () => {},
}) {
  let animationFrameId = null;
  let eventsBound = false;

  // Dedicated live stroke layer: independent of neon fade and selection repaint.
  const liveCanvas = document.createElement("canvas");
  liveCanvas.className = "drawing-live-stroke-layer";
  liveCanvas.setAttribute("aria-hidden", "true");
  liveCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:135;pointer-events:none;touch-action:none";
  standardDrawingCanvas.parentElement.appendChild(liveCanvas);
  // Non-destructive eraser footprint preview, independent of both drawing canvases.
  const eraserCursor = document.createElement("div");
  eraserCursor.className = "drawing-partial-eraser-cursor";
  eraserCursor.setAttribute("aria-hidden", "true");
  standardDrawingCanvas.parentElement.appendChild(eraserCursor);
  const updateEraserCursor = e => {
    const visible = isDrawingModeActive && getSlideTool() === 'eraser' && getEraserMode() === 'partial';
    eraserCursor.style.display = visible ? 'block' : 'none';
    if (!visible || !e) return;
    const rect=standardDrawingCanvas.getBoundingClientRect();
    eraserCursor.style.left=`${e.clientX-rect.left}px`;
    eraserCursor.style.top=`${e.clientY-rect.top}px`;
    eraserCursor.style.width=eraserCursor.style.height=`${Math.max(6,getEraserRadius()*2)}px`;
  };
  const liveCtx = liveCanvas.getContext("2d");
  const clearLive = () => liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  // Paint only the newest segment while dragging. Repainting the entire live
  // stroke on every pointermove can starve pointer feedback while a costly neon
  // shadow animation is active.
  const renderLive = () => {
    clearLive();
    const stroke = activeScreenStroke;
    if (!stroke || !stroke.points.length) return;
    liveCtx.save();
    liveCtx.lineCap = "round";
    liveCtx.lineJoin = "round";
    liveCtx.strokeStyle = stroke.color;
    liveCtx.lineWidth = stroke.width;
    liveCtx.beginPath();
    liveCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      liveCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    if (stroke.points.length === 1) liveCtx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y + 0.01);
    liveCtx.stroke();
    liveCtx.restore();
  };
  // Repaint the complete in-progress stroke as one path. Drawing its segments
  // individually accumulates alpha at joints and makes the line darker until
  // pointerup, when the committed renderer paints it as a single path.
  const appendLivePoint = (pos) => {
    if (!activeScreenStroke) return;
    activeScreenStroke.points.push(pos);
    renderLive();
  };
  const neonLines = [];
  // Screen strokes are intentionally session-only, but editable independently.
  const screenStrokes = [];
  let screenSelected = -1;
  const screenSelectedIndices = new Set();
  const copyStrokes = () => structuredClone(screenStrokes);
  const notifySelection = () => onScreenSelectionChanged(getScreenSelection());
  const recordScreenChange = before => {
    const after = copyStrokes();
    if (JSON.stringify(before) !== JSON.stringify(after)) onScreenHistory({before, after});
  };
  const setScreenStrokes = strokes => {
    screenStrokes.splice(0, screenStrokes.length, ...structuredClone(strokes ?? []));
    screenSelected = -1; screenSelectedIndices.clear(); screenHovered = -1; activeScreenStroke = null;
    clearLive(); renderScreenStrokes(); notifySelection();
  };

  let screenHovered = -1;
  let selectionPulse = 1;
  const getScreenSelection = () => screenSelected >= 0 ? { index: screenSelected, count:screenSelectedIndices.size } : null;
  const clearScreenSelection = () => {
    if (screenSelected < 0 && screenHovered < 0) return;
    screenSelected = -1; screenSelectedIndices.clear(); screenHovered = -1; renderScreenStrokes(); notifySelection();
  };
  const setSelectionPulse = value => {
    if (screenSelected < 0) return;
    selectionPulse = value; renderScreenStrokes();
  };
  const copyScreenSelection=()=>copySelectedStrokes(screenStrokes,(_,i)=>screenSelectedIndices.has(i));
  const pasteScreenSelection=(clipboard)=>{
    if(!clipboard?.length)return false;
    const before=copyStrokes();
    const result=pasteStrokes(screenStrokes,clipboard,18,18,(_,i)=>`screen-paste-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`);
    screenStrokes.splice(0,screenStrokes.length,...result.strokes);
    screenSelectedIndices.clear();for(let i=screenStrokes.length-result.pasted.length;i<screenStrokes.length;i++)screenSelectedIndices.add(i);
    screenSelected=screenStrokes.length-result.pasted.length;
    renderScreenStrokes();notifySelection();recordScreenChange(before);return true;
  };
  const transformScreenSelection = ({angleDeg=0,scale=1}={}) => {
    if (screenSelected < 0) return false;
    const before=copyStrokes();
    const after=transformSelectedStrokes(screenStrokes,(_,i)=>screenSelectedIndices.has(i),{angleDeg,scale});
    if (JSON.stringify(after)===JSON.stringify(before)) return false;
    screenStrokes.splice(0,screenStrokes.length,...after);
    renderScreenStrokes();recordScreenChange(before);notifySelection();return true;
  };
  const deleteScreenSelection = () => {
    if (screenSelected < 0 || screenSelected >= screenStrokes.length) return false;
    const before = copyStrokes();
    const updated = withoutStroke(screenStrokes, (_, index) => screenSelectedIndices.has(index));
    screenStrokes.splice(0, screenStrokes.length, ...updated); clearScreenSelection(); renderScreenStrokes(); recordScreenChange(before); return true;
  };
  const updateScreenSelection = ({color, width}) => {
    const stroke = screenStrokes[screenSelected];
    if (!stroke) return false;
    const before = copyStrokes();
    const updated = withStrokeStyle(screenStrokes, (_, index) => screenSelectedIndices.has(index), {color, width});
    screenStrokes.splice(0, screenStrokes.length, ...updated);
    renderScreenStrokes(); recordScreenChange(before); return true;
  };
  let activeScreenStroke = null;
  let screenStrokeBefore = null;
  let screenEraseBefore = null; let screenErasePrevious = null;
  let screenMove = null;
  const hitScreenStroke = p => findNearestStroke(screenStrokes, p, {
    reverse:true,
    toleranceOf:line => Math.max(8, line.width/2+5),
  })?.index ?? -1;
  const renderScreenStrokes = () => {
    standardDrawingCtx.clearRect(0,0,standardDrawingCanvas.width,standardDrawingCanvas.height);
    for (let i=0;i<screenStrokes.length;i++) {
      const stroke=screenStrokes[i],points=stroke.points;
      if(!points.length)continue;
      standardDrawingCtx.save();
      standardDrawingCtx.beginPath();
      standardDrawingCtx.lineCap='round';standardDrawingCtx.lineJoin='round';
      standardDrawingCtx.moveTo(points[0].x,points[0].y);
      for(let j=1;j<points.length;j++)standardDrawingCtx.lineTo(points[j].x,points[j].y);
      if(points.length===1)standardDrawingCtx.lineTo(points[0].x+.01,points[0].y+.01);
      standardDrawingCtx.strokeStyle=stroke.color;standardDrawingCtx.lineWidth=stroke.width;standardDrawingCtx.stroke();
      if (i===screenHovered || screenSelectedIndices.has(i)) {
        standardDrawingCtx.strokeStyle=i===screenHovered?'#ff9d2e':'#22d3ee';
        standardDrawingCtx.lineWidth=stroke.width+5;
        standardDrawingCtx.globalAlpha=screenSelectedIndices.has(i) ? selectionPulse : .65;
        standardDrawingCtx.stroke();
      }
      standardDrawingCtx.restore();
    }
    // Drawing-7F selection frame and handles; not part of saved stroke data.
    if(screenSelectedIndices.size) {
      const pts=screenStrokes.filter((s,i)=>screenSelectedIndices.has(i)).flatMap(s=>s.points||[]);
      if(pts.length){
        const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
        const l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys),cx=(l+r)/2,cy=(t+b)/2;
        standardDrawingCtx.save();standardDrawingCtx.strokeStyle='#22d3ee';standardDrawingCtx.lineWidth=1.5;
        standardDrawingCtx.setLineDash([6,4]);standardDrawingCtx.strokeRect(l-7,t-7,r-l+14,b-t+14);
        standardDrawingCtx.setLineDash([]);standardDrawingCtx.fillStyle='#22d3ee';
        for(const [x,y] of [[cx,cy],[r+7,b+7],[cx,t-29]]){
          standardDrawingCtx.beginPath();standardDrawingCtx.arc(x,y,7,0,Math.PI*2);standardDrawingCtx.fill();
        }
        standardDrawingCtx.beginPath();standardDrawingCtx.moveTo(cx,t-7);standardDrawingCtx.lineTo(cx,t-22);standardDrawingCtx.stroke();
        standardDrawingCtx.restore();
      }
    }
  };

  let isDrawingModeActive = false;

  let isDrawing = false;

  let activeCanvas;

  let activeCtx;

  let currentColor = "rgba(255, 0, 0, 1)";

  let currentLineWidth = 9;


  const resizeCanvas = function () {
    // キャンバスの描画サイズを、表示サイズ（CSSで定義）と一致させる
    neonDrawingCanvas.width = neonDrawingCanvas.offsetWidth;
    neonDrawingCanvas.height = neonDrawingCanvas.offsetHeight;
    standardDrawingCanvas.width = standardDrawingCanvas.offsetWidth;
    standardDrawingCanvas.height = standardDrawingCanvas.offsetHeight;
    liveCanvas.width = standardDrawingCanvas.width;
    liveCanvas.height = standardDrawingCanvas.height;
    renderScreenStrokes();
  };

  const attachDrawings = function () {
    applyButtonEffect(drawingButton);
    safePlayButtonAudio("SWITCH");

    toggleActiveLayer();

    if (isCameraControlViaMouse()) {
      detachCameraControl();
    }

    // マウスイベント登録
    neonDrawingCanvas.addEventListener("pointerdown", startDrawing, {
      passive: false,
    });
    neonDrawingCanvas.addEventListener("pointermove", duringDrawing, {
      passive: false,
    });
    neonDrawingCanvas.addEventListener("pointercancel", endDrawing, {
      passive: false,
    });
    neonDrawingCanvas.addEventListener("pointerleave", endDrawing, {
      passive: false,
    });
    neonDrawingCanvas.addEventListener("pointerup", endDrawing, {
      passive: false,
    });
    standardDrawingCanvas.addEventListener("pointerdown", startDrawing, {
      passive: false,
    });
    standardDrawingCanvas.addEventListener("pointermove", duringDrawing, {
      passive: false,
    });
    standardDrawingCanvas.addEventListener("pointercancel", endDrawing, {
      passive: false,
    });
    standardDrawingCanvas.addEventListener("pointerleave", endDrawing, {
      passive: false,
    });
    standardDrawingCanvas.addEventListener("pointerup", endDrawing, {
      passive: false,
    });

    syncScreenLayerOrder();

    isDrawingModeActive = true;

    drawingStatus.innerHTML = "停止";
    drawingButton.classList.remove("active");
    drawingButton.classList.add("active");
  };

  const detachDrawings = function () {
    applyButtonEffect(drawingButton);

    safePlayButtonAudio("CURRENT");

    // Keep both screen canvases visible when editing is stopped.
    // Only pointer interaction is disabled; screen annotations remain visible.
    neonDrawingCanvas.style.zIndex = 112;
    standardDrawingCanvas.style.zIndex = 113;
    neonDrawingCanvas.style.pointerEvents = 'none';
    standardDrawingCanvas.style.pointerEvents = 'none';

    isDrawingModeActive = false;
    eraserCursor.style.display = "none";
    clearScreenSelection();
    activeScreenStroke = null; screenStrokeBefore = null; clearLive();

    drawingStatus.innerHTML = "開始";
    drawingButton.classList.remove("active");

    // マウスイベント除去
    neonDrawingCanvas.removeEventListener("pointerdown", startDrawing, {
      passive: false,
    });
    neonDrawingCanvas.removeEventListener("pointermove", duringDrawing, {
      passive: false,
    });
    neonDrawingCanvas.removeEventListener("pointercancel", endDrawing, {
      passive: false,
    });
    neonDrawingCanvas.removeEventListener("pointerleave", endDrawing, {
      passive: false,
    });
    neonDrawingCanvas.removeEventListener("pointerup", endDrawing, {
      passive: false,
    });
    standardDrawingCanvas.removeEventListener("pointerdown", startDrawing, {
      passive: false,
    });
    standardDrawingCanvas.removeEventListener("pointermove", duringDrawing, {
      passive: false,
    });
    standardDrawingCanvas.removeEventListener("pointercancel", endDrawing, {
      passive: false,
    });
    standardDrawingCanvas.removeEventListener("pointerleave", endDrawing, {
      passive: false,
    });
    standardDrawingCanvas.removeEventListener("pointerup", endDrawing, {
      passive: false,
    });
  };

  const switchDrawing = function () {
    if (isDrawingModeActive) {
      detachDrawings();
    } else {
      attachDrawings();
    }
  };

  const syncScreenLayerOrder = () => {
    // Live standard pen strokes must remain visible even while neon fades or
    // a selected stroke is pulsing. The active canvas owns pointer hit testing.
    const neonActive = Boolean(layerSwitch.checked && getSlideTool() === 'brush');
    neonDrawingCanvas.style.zIndex = neonActive ? 131 : 130;
    standardDrawingCanvas.style.zIndex = neonActive ? 130 : 131;
    neonDrawingCanvas.style.pointerEvents = neonActive ? 'auto' : 'none';
    standardDrawingCanvas.style.pointerEvents = neonActive ? 'none' : 'auto';
  };
  const toggleActiveLayer = function () {
    applyButtonEffect(layerSwitchLabel);
    if (layerSwitch.checked) {
      activeCanvas = neonDrawingCanvas;
      activeCtx = neonDrawingCtx;
    } else {
      activeCanvas = standardDrawingCanvas;
      activeCtx = standardDrawingCtx;
    }
    if (isDrawingModeActive) syncScreenLayerOrder();
  };

  const clearScreenDrawings = function ({ recordHistory = true } = {}) {
    const before = copyStrokes();
    neonLines.length = 0;
    neonDrawingCtx.clearRect(0, 0, neonDrawingCanvas.width, neonDrawingCanvas.height);
    screenStrokes.length=0;screenSelected=-1;screenSelectedIndices.clear();screenHovered=-1;activeScreenStroke=null;clearLive();
    standardDrawingCtx.clearRect(0, 0, standardDrawingCanvas.width, standardDrawingCanvas.height);
    notifySelection(); if (recordHistory) recordScreenChange(before);
  };

  const clearDrawings = function () {
    applyButtonEffect(clearDrawingsButton);
    safePlayButtonAudio("OK");
    slideDrawing?.clear();
    clearScreenDrawings();
  };

  const getPointerPosInActiveCanvas = function (e) {
    return getPointerPos(activeCanvas, e);
  };

  const startDrawing = function (e) {
    updateEraserCursor(e);
    if (!isDrawingModeActive) return;

    // pointerイベントのボタンをチェック (左クリックまたはタッチ)
    if (e.pointerType !== "mouse" && e.pointerType !== "touch" && e.pointerType !== "pen") {
      return;
    }
    // マウスイベントの場合、左ボタンのみを許可
    if ((e.pointerType === "mouse" || e.pointerType === "pen") && e.button !== 0) {
      return;
    }

    if (drawingTargetSelect?.value === "slide") {
      // Selecting/erasing is an atomic click, not a brush drag.
      const tool = getSlideTool();
      isDrawing = tool === "brush" || (tool === "eraser" && getEraserMode()==="partial");
      slideDrawing?.pointerDown(e);
      return;
    }
    if(getSlideTool()==='eraser' && getEraserMode()==='partial') {
      isDrawing=true;
      screenEraseBefore=copyStrokes();
      screenErasePrevious=getPointerPos(standardDrawingCanvas,e);
      eraseScreenAt(screenErasePrevious);
      return;
    }
    if(getSlideTool()!=='brush'){
      isDrawing=false;
      const pointer=getPointerPos(standardDrawingCanvas,e);
      const hit=hitScreenStroke(pointer);
      if(getSlideTool()==='select' && screenSelectedIndices.size && !(e.ctrlKey||e.metaKey)) {
        const pts=screenStrokes.filter((s,i)=>screenSelectedIndices.has(i)).flatMap(s=>s.points||[]);
        if(pts.length){
          const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys),cx=(l+r)/2;
          const mode=Math.hypot(pointer.x-cx,pointer.y-(t-29))<=14?'rotate':
            Math.hypot(pointer.x-(r+7),pointer.y-(b+7))<=14?'scale':null;
          if(mode){const before=copyStrokes();screenMove={last:pointer,start:pointer,before,moved:false,mode,center:selectedStrokeCenter(before,(_,i)=>screenSelectedIndices.has(i))};return;}
        }
      }
      if(getSlideTool()==='eraser' && hit>=0){const before=copyStrokes();screenStrokes.splice(0,screenStrokes.length,...withoutStroke(screenStrokes,(_,i)=>i===hit));screenSelected=-1;screenSelectedIndices.clear();screenHovered=-1;renderScreenStrokes();notifySelection();recordScreenChange(before);}
      else if(getSlideTool()==='select'){
        if(hit>=0 && screenSelectedIndices.has(hit) && !(e.ctrlKey||e.metaKey)) {
          const before=copyStrokes(),mode="move";
          const center=selectedStrokeCenter(before,(_,i)=>screenSelectedIndices.has(i));
          screenMove={last:getPointerPos(standardDrawingCanvas,e),start:getPointerPos(standardDrawingCanvas,e),before,moved:false,mode,center};
        }
        else {
        if (!(e.ctrlKey || e.metaKey)) screenSelectedIndices.clear();
        if(hit>=0){if((e.ctrlKey || e.metaKey) && screenSelectedIndices.has(hit))screenSelectedIndices.delete(hit);else screenSelectedIndices.add(hit);}
        screenSelected = screenSelectedIndices.size ? [...screenSelectedIndices][0] : -1;
        }
      }
      renderScreenStrokes(); notifySelection();
      return;
    }
    isDrawing = true;
    const pos = getPointerPosInActiveCanvas(e);

    if (getSlideTool() === "brush" && activeCanvas.id === "standardDrawingCanvas") {
      screenStrokeBefore=copyStrokes();
      activeScreenStroke={id:`screen-${Date.now()}-${screenStrokes.length}`,color:getStrokeColor(),width:currentLineWidth,points:[pos]};
      screenSelected=-1;screenSelectedIndices.clear();screenHovered=-1;
      renderScreenStrokes(); renderLive(); notifySelection();
    } else {
      // Neon Canvas
      const newLine = {
        points: [{ x: pos.x, y: pos.y }],
        startTime: Date.now(),
        lineWidth: currentLineWidth,
        color: getStrokeColor(),
      };
      neonLines.push(newLine);
    }
  };

  const eraseScreenAt = pos => {
    const after=erasePolylineAt(screenStrokes,pos,getEraserRadius(),{
      idFor:(item,i)=>`${item.id}-cut-${Date.now()}-${i}`,
    });
    if(after===screenStrokes)return;
    screenStrokes.splice(0,screenStrokes.length,...after);
    screenSelected=-1;screenSelectedIndices.clear();screenHovered=-1;renderScreenStrokes();notifySelection();
  };
  const duringDrawing = function (e) {
    updateEraserCursor(e);
    if (!isDrawingModeActive) return;
    if (drawingTargetSelect?.value === "slide") {
      // Selection and erase previews require pointer moves even without a drag.
      if (getSlideTool() !== "brush" || isDrawing) slideDrawing?.pointerMove(e);
      return;
    }
    if(screenMove){
      const pos=getPointerPos(standardDrawingCanvas,e),dx=pos.x-screenMove.last.x,dy=pos.y-screenMove.last.y;
      if(dx||dy){
        const result=screenMove.mode==='move'
          ? translateSelectedStrokes(screenStrokes,(_,i)=>screenSelectedIndices.has(i),dx,dy)
          : transformSelectedStrokes(screenMove.before,(_,i)=>screenSelectedIndices.has(i),
              dragTransform(screenMove.center,screenMove.start,pos,screenMove.mode,{minimumRadius:3}));
        screenStrokes.splice(0,screenStrokes.length,...result);
        if(screenMove.mode==='move')screenMove.last=pos;
        screenMove.moved=true;renderScreenStrokes();
      }
      return;
    }
    if (screenEraseBefore) {
      const pos = getPointerPos(standardDrawingCanvas, e);
      const a = screenErasePrevious ?? pos;
      const steps = Math.max(1, Math.ceil(Math.hypot(pos.x-a.x, pos.y-a.y) / Math.max(3, currentLineWidth)));
      for (let i = 1; i <= steps; i++) {
        eraseScreenAt({x:a.x+(pos.x-a.x)*i/steps, y:a.y+(pos.y-a.y)*i/steps});
      }
      screenErasePrevious = pos;
      return;
    }
    if (!isDrawing) {
      if(!layerSwitch.checked && getSlideTool()!=='brush'){
        const hit=hitScreenStroke(getPointerPos(standardDrawingCanvas,e));
        if(hit!==screenHovered){screenHovered=hit;renderScreenStrokes();}
      }
      return;
    }
    const pos = getPointerPosInActiveCanvas(e);

    if (getSlideTool() === "brush" && activeCanvas.id === "standardDrawingCanvas") {
      if(activeScreenStroke) appendLivePoint(pos);
    } else {
      // Neon Canvas
      const currentLine = neonLines[neonLines.length - 1];
      if (currentLine) {
        currentLine.points.push({ x: pos.x, y: pos.y });
      }
    }
  };

  const endDrawing = function (e) {
    if(screenMove){const {before,moved}=screenMove;screenMove=null;if(moved){recordScreenChange(before);notifySelection();}return;}
    if (drawingTargetSelect?.value === "slide" && getSlideTool() === "eraser" && getEraserMode()==="partial") {
      slideDrawing?.pointerUp(); isDrawing=false; return;
    }
    // Selection moves and whole-stroke erasing do not mark isDrawing=true.
    // Still release the slide controller's active gesture on pointerup/leave;
    // otherwise the next hover keeps translating the old selection forever.
    if (drawingTargetSelect?.value === "slide" && getSlideTool() !== "brush") {
      slideDrawing?.pointerUp();
      isDrawing = false;
      return;
    }
    if (!isDrawing) return;
    if(screenEraseBefore){recordScreenChange(screenEraseBefore);screenEraseBefore=null;screenErasePrevious=null;isDrawing=false;return;}
    isDrawing = false;
    if (activeScreenStroke && screenStrokeBefore) {
      screenStrokes.push(activeScreenStroke);
      recordScreenChange(screenStrokeBefore);
      renderScreenStrokes();
    }
    activeScreenStroke=null; screenStrokeBefore=null; clearLive();
    slideDrawing?.pointerUp();
  };

  let lastNeonRenderAt = 0;
  const animateNeon = function (timestamp = 0) {
    // Keep pointer-driven ink responsive: neon glow blur is expensive and does
    // not require a full 60 fps while fading.
    if (timestamp && timestamp - lastNeonRenderAt < 33) {
      animationFrameId = requestAnimationFrame(animateNeon);
      return;
    }
    lastNeonRenderAt = timestamp;
    if (neonLines.length === 0) {
      neonDrawingCtx.clearRect(0, 0, neonDrawingCanvas.width, neonDrawingCanvas.height);
      animationFrameId = requestAnimationFrame(animateNeon);
      return;
    }
    neonDrawingCtx.clearRect(
      0,
      0,
      neonDrawingCanvas.width,
      neonDrawingCanvas.height,
    );

    const now = Date.now();
    const fadeTime = parseInt(fadeTimeInput.value) * 1000; // 3 * 1000; //

    for (let i = neonLines.length - 1; i >= 0; i--) {
      const line = neonLines[i];
      const age = now - line.startTime;
      const opacity = 1 - age / fadeTime;

      if (opacity <= 0) {
        neonLines.splice(i, 1);
        continue;
      }

      // Respect the alpha encoded in the stroke color. Do not draw a solid
      // white core over translucent ink; opacity should remain perceptible.
      const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(line.color);
      const alpha = rgba ? Math.max(0, Math.min(1, Number(rgba[4] ?? 1))) : 1;
      const inkColor = rgba ? `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})` : line.color;
      neonDrawingCtx.globalAlpha = opacity * alpha * 0.92;
      neonDrawingCtx.strokeStyle = inkColor;
      neonDrawingCtx.lineWidth = line.lineWidth;
      neonDrawingCtx.lineCap = "round";
      neonDrawingCtx.lineJoin = "round";
      neonDrawingCtx.shadowBlur = line.lineWidth * 3.5;
      neonDrawingCtx.shadowColor = inkColor;
      if (line.points.length > 1) {
        neonDrawingCtx.beginPath();
        neonDrawingCtx.moveTo(line.points[0].x, line.points[0].y);
        for (let j = 1; j < line.points.length; j++) neonDrawingCtx.lineTo(line.points[j].x, line.points[j].y);
        neonDrawingCtx.stroke();
        neonDrawingCtx.shadowBlur = 0;
        // A luminous near-white core is intentional for transient neon. Its
        // brightness is maintained even when the chosen pen alpha is low;
        // the whole effect still fades out with time.
        neonDrawingCtx.globalAlpha = opacity * (0.65 + 0.35 * alpha);
        neonDrawingCtx.strokeStyle = "#f7fbff";
        neonDrawingCtx.lineWidth = Math.max(1, line.lineWidth * 0.30);
        neonDrawingCtx.stroke();
      }
    }

    neonDrawingCtx.globalAlpha = 1;
    neonDrawingCtx.shadowBlur = 0;
    neonDrawingCtx.shadowColor = "transparent";
    animationFrameId = requestAnimationFrame(animateNeon);
  };

  const startNeonAnimation = function () {
    if (animationFrameId === null) animateNeon();
  };

  const stopNeonAnimation = function () {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const bindEvents = function () {
    if (eventsBound) return;
    eventsBound = true;
    drawingButton.addEventListener("click", () => {
      switchDrawing();
    });

    layerSwitch.addEventListener("change", () => {
      toggleActiveLayer();
    });

    // お絵描きの線の色
    colorOptions.forEach((option) => {
      option.addEventListener("click", () => {
        colorOptions.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");
        currentColor = option.getAttribute("data-color");
      });
    });

    // お絵描きの線の幅
    lineWidthOptions.forEach((option) => {
      option.addEventListener("click", () => {
        lineWidthOptions.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");
        currentLineWidth = parseInt(option.getAttribute("data-width"));
      });
    });

    clearDrawingsButton.addEventListener("click", () => {
      clearDrawings();
    });

  };

  return {
    isActive: () => isDrawingModeActive,
    resizeCanvas,
    detachDrawings,
    switchDrawing,
    toggleActiveLayer,
    clearDrawings,
    clearScreenDrawings,
    clearScreenSelection, getScreenSelection, setSelectionPulse, deleteScreenSelection, updateScreenSelection, copyScreenSelection, pasteScreenSelection, transformScreenSelection,
    getScreenStrokes: copyStrokes, setScreenStrokes, refreshScreenLayerOrder: () => {if(isDrawingModeActive) syncScreenLayerOrder();},
    bindEvents,
    startNeonAnimation,
    stopNeonAnimation,
  };
};
