import { transformSelectedStrokes, selectedStrokeCenter, dragTransform } from "./strokeOperations.js";
// Drawing-2: slide-local UV strokes persist in slideState.drawings.
// A completed stroke is one editor history item.
import { translateSelectedStrokes, copySelectedStrokes, pasteStrokes } from './strokeClipboard.js';
import { findNearestStroke, withoutStroke, withStrokeStyle, erasePolylineAt } from './strokeOperations.js';
import { createDrawingDiagnostics } from './drawingDiagnostics.js';
import { Matrix, MeshBuilder, Mesh, StandardMaterial, DynamicTexture, Color3, Material, Engine } from '@babylonjs/core';

export function localSlidePointToUV(point, width = 1.6, height = 0.9) {
  return { u: point.x / width + 0.5, v: 0.5 - point.y / height };
}
export function isSlideUVInside(uv) {
  return Number.isFinite(uv.u) && Number.isFinite(uv.v) && uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1;
}

export function createSlideDrawingController({ getScene, getSlides, getCanvas, getColor, getWidth, getStyle = () => "standard", getFadeSeconds = () => 3, getGlowStrength = () => 1, getGlowLayer = () => null, getTool = () => "brush", getDragMode = () => "move", getEraserMode = () => "stroke", getEraserRadius = () => 12, onSelectionChanged = () => {}, onStrokeCommitted = () => {}, onClearCommitted = () => {}, diagnostics = null }) {
  // Diagnostic sampling is opt-in; the normal rendering path stays unchanged.
  const metrics = diagnostics ?? createDrawingDiagnostics();
  const layers = new Map();
  let stroke = null;
  let eraserGesture = null;
  let moveGesture = null;
  let selected = null;
  let hovered = null;
  let highlightPulse = 1;
  let lastScene = null;
  const transientNeon = [];
  let neonTimer = null;
  const WIDTH = 1024, HEIGHT = 576;

  function resetIfSceneChanged(scene) {
    if (scene === lastScene) return;
    layers.clear();
    transientNeon.length = 0;
    if (neonTimer !== null) { clearInterval(neonTimer); neonTimer = null; }
    stroke = null; eraserGesture = null; moveGesture = null;
    selectedStrokeIds.clear();
    selected = null;
    hovered = null;
    lastScene = scene;
  }
  function ensureLayer(slide) {
    const mesh = slide.mesh;
    let layer = layers.get(mesh);
    if (layer) { layer.slide = slide; return layer; }
    const overlay = MeshBuilder.CreatePlane(`drawing-overlay-${slide.id}`, {
      width: 1.6, height: 0.9, sideOrientation: Mesh.DOUBLESIDE,
    }, mesh.getScene());
    overlay.parent = mesh;
    overlay.position.z = -0.002;
    overlay.isPickable = false;
    const texture = new DynamicTexture(`drawing-texture-${slide.id}`, { width: WIDTH, height: HEIGHT }, mesh.getScene(), false);
    texture.hasAlpha = true;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    texture.update();
    // Annotation remains outside glow source pass. Its opaque parent slide is now
    // separately rendered as a black depth occluder in that pass (Drawing-1C).
    getGlowLayer()?.addExcludedMesh(overlay);
    const material = new StandardMaterial(`drawing-material-${slide.id}`, mesh.getScene());
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    // An emissive texture reproduces the actual brush pigment, rather than
    // illuminating the translucent plane with white (which washes out strokes).
    material.diffuseColor = Color3.Black();
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.White();
    material.alphaMode = Engine.ALPHA_COMBINE;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    // Opaque stroke pixels must occlude glow-producing geometry behind them.
    material.forceDepthWrite = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.specularColor = Color3.Black();
    overlay.material = material;
    layer = { overlay, texture, ctx, slide };
    layers.set(mesh, layer);
    renderStrokes(layer, slide.drawings);
    return layer;
  }
  function pick(event) {
    const scene = getScene();
    if (!scene || !scene.activeCamera) return null;
    resetIfSceneChanged(scene);
    const canvas = getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const slides = getSlides();
    const byMesh = new Map(slides.filter(s => s.mesh && !s.mesh.isDisposed()).map(s => [s.mesh, s]));
    const hit = scene.pick(x, y, mesh => byMesh.has(mesh), false, scene.activeCamera);
    if (!hit?.hit || !hit.pickedMesh || !hit.pickedPoint) return null;
    const slide = byMesh.get(hit.pickedMesh);
    const inverse = hit.pickedMesh.getWorldMatrix().clone().invert();
    const p = hit.pickedPoint;
    const local = {
      x: p.x * inverse.m[0] + p.y * inverse.m[4] + p.z * inverse.m[8] + inverse.m[12],
      y: p.x * inverse.m[1] + p.y * inverse.m[5] + p.z * inverse.m[9] + inverse.m[13],
    };
    const uv = localSlidePointToUV(local);
    return isSlideUVInside(uv) ? { slide, uv } : null;
  }
  function drawSegment(layer, a, b, color, width, update = true) {
    const ctx = layer.ctx;
    ctx.beginPath();
    ctx.moveTo(a.u * WIDTH, a.v * HEIGHT);
    ctx.lineTo(b.u * WIDTH, b.v * HEIGHT);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1, width * 1.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
    if (update) layer.texture.update();
  }
  function drawNeonStroke(layer, item, opacity) {
    const points = item.points;
    if (!points?.length || opacity <= 0) return;
    const ctx = layer.ctx;
    const width = Math.max(1, item.width * 1.5);
    // The color owns the requested opacity. Apply the fading factor only once;
    // a white inner core otherwise makes a 30% pen look effectively opaque.
    const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(item.color);
    const baseAlpha = match ? Math.max(0, Math.min(1, Number(match[4] ?? 1))) : 1;
    const opaqueColor = match ? `rgb(${match[1]}, ${match[2]}, ${match[3]})` : item.color;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * baseAlpha * 0.92));
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = opaqueColor;
    ctx.lineWidth = width;
    ctx.shadowColor = opaqueColor;
    ctx.shadowBlur = width * 3.5 * item.strength;
    ctx.beginPath();
    ctx.moveTo(points[0][0] * WIDTH, points[0][1] * HEIGHT);
    if (points.length === 1) ctx.lineTo(points[0][0] * WIDTH + 0.01, points[0][1] * HEIGHT);
    else for (const [u,v] of points.slice(1)) ctx.lineTo(u * WIDTH, v * HEIGHT);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // A bright tinted core restores the neon appearance; its opacity still
    // follows the slider rather than becoming an opaque white line.
    ctx.lineWidth = Math.max(1, width * 0.30);
    ctx.strokeStyle = "#f7fbff";
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * (0.65 + 0.35 * baseAlpha)));
    ctx.stroke();
    ctx.restore();
  }
  // Shared polyline renderer for committed [u,v] points and live {u,v} points.
  // Callers choose their data source; this function never mutates or commits it.
  function drawStrokePolyline(layer, rawPoints, color, width, isSaved) {
    if (!Array.isArray(rawPoints) || !rawPoints.length) return;
    const toUV = p => isSaved ? { u: p[0], v: p[1] } : p;
    // Render a single path: one alpha compositing operation per stroke.
    // Separate segment strokes accumulate alpha at every join.
    const ctx = layer.ctx;
    const first = toUV(rawPoints[0]);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(first.u * WIDTH, first.v * HEIGHT);
    if (rawPoints.length === 1) ctx.lineTo(first.u * WIDTH + 0.01, first.v * HEIGHT);
    for (let i = 1; i < rawPoints.length; i++) {
      const pt = toUV(rawPoints[i]);
      ctx.lineTo(pt.u * WIDTH, pt.v * HEIGHT);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1, width * 1.5);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }
  // Drawing-6A: four rendering phases, all driven by the same stroke state.
  // Do not serialize preview/neon/selection into slide.drawings.
  function renderStrokes(layer, strokes) {
    return metrics.measure("slide.fullRepaint", () => renderStrokesBody(layer, strokes));
  }
  function renderStrokesBody(layer, strokes) {
    layer.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (const item of Array.isArray(strokes) ? strokes : []) {
      drawStrokePolyline(layer, item.points, item.color, item.width, true);
    }
    // Phase 2: transient neon overlays, including live neon preview.
    const now = performance.now();
    for (const item of transientNeon) {
      if (item.slideId !== layer.slide.id) continue;
      drawNeonStroke(layer, item, 1 - (now - item.startedAt) / item.fadeMs);
    }
    // An in-progress neon stroke is previewed, but not committed or serialized.
    if (stroke?.kind === "neon" && stroke.mesh === layer.slide.mesh) {
      drawNeonStroke(layer, { ...stroke, points: stroke.points.map(p => [p.u,p.v]) }, 1);
    }
    // Phase 3: ephemeral selection and erase-target feedback.
    // Transient visual feedback is never added to slide.drawings or project.json.
    function outline(item, color) {
      if (!item?.points?.length) return;
      const ctx = layer.ctx;
      ctx.save();
      ctx.beginPath();
      item.points.forEach(([u,v], index) => index ? ctx.lineTo(u * WIDTH, v * HEIGHT) : ctx.moveTo(u * WIDTH, v * HEIGHT));
      ctx.lineWidth = Math.max(6, (Number(item.width) || 3) * 1.5 + 7);
      ctx.strokeStyle = color; ctx.globalAlpha = color === "#00eaff" ? highlightPulse : 0.9;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.stroke(); ctx.restore();
    }
    if (selected?.slideId === layer.slide.id) for (const item of strokes || []) if (selectedStrokeIds.has(item.id)) outline(item, "#00eaff");
    if (hovered?.slideId === layer.slide.id) outline((strokes || []).find(s => s.id === hovered.strokeId), "#ff9a22");
    // Drawing-7F: transient bounding rectangle, center and transform handles.
    if (selected?.slideId === layer.slide.id && selectedStrokeIds.size) {
      const pts = (strokes || []).filter(s=>selectedStrokeIds.has(s.id)).flatMap(s=>s.points||[]);
      if (pts.length) {
        const xs=pts.map(p=>p[0]*WIDTH),ys=pts.map(p=>p[1]*HEIGHT);
        const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
        const cx=(left+right)/2,cy=(top+bottom)/2;
        const ctx=layer.ctx;ctx.save();ctx.setLineDash([6,4]);ctx.lineWidth=1.7;
        ctx.strokeStyle='#22d3ee';ctx.strokeRect(left-7,top-7,right-left+14,bottom-top+14);ctx.setLineDash([]);
        ctx.fillStyle='#22d3ee';ctx.strokeStyle='#102030';ctx.lineWidth=2;
        for (const [x,y] of [[cx,cy],[right+7,bottom+7],[cx,top-29]]) {
          ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
        }
        ctx.beginPath();ctx.moveTo(cx,top-7);ctx.lineTo(cx,top-22);ctx.strokeStyle='#22d3ee';ctx.stroke();
        ctx.restore();
      }
    }
    // Phase 4: in-progress standard stroke LAST, preserving Drawing-5I.
    // clearRect also erases incremental standard ink. Every full repaint (neon
    // fade, selection pulse or refresh) must restore the entire active stroke.
    // Keep it above transient feedback, and out of saved drawings/history until
    // pointerUp. Screen's independent live canvas does not cover slide textures.
    if (stroke?.kind === "standard" && stroke.mesh === layer.slide.mesh) {
      drawStrokePolyline(layer, stroke.points, stroke.color, stroke.width, false);
    }
    layer.texture.update();
  }
  function refreshSlide(slide) {
    if (!slide?.mesh || slide.mesh.isDisposed()) return;
    resetIfSceneChanged(slide.mesh.getScene());
    const layer = layers.get(slide.mesh);
    if (layer) { layer.slide = slide; renderStrokes(layer, slide.drawings); }
    else if (slide.drawings?.length) ensureLayer(slide);
  }
  function setHighlightPulse(value) {
    if (!selected) return;
    highlightPulse = value;
    refreshAll();
  }
  const selectedStrokeIds = new Set();
  function clearSelection() {
    if (!selected && !hovered) return;
    moveGesture = null;
    selected = null; selectedStrokeIds.clear(); hovered = null;
    onSelectionChanged(null);
    refreshAll();
  }
  function getSelection() { return selected ? { ...selected, count: selectedStrokeIds.size } : null; }
  function refreshAll() {
    for (const slide of getSlides()) refreshSlide(slide);
  }
  // Coordinates and hit-testing remain slide-local, independently of camera angle.
  function nearestStroke(slide, uv, tolerance = 0.025) {
    const strokes = Array.isArray(slide.drawings) ? slide.drawings : [];
    return findNearestStroke(strokes, {x:uv.u, y:uv.v}, {
      reverse:false,
      pointOf:p => ({x:p[0], y:p[1]}),
      toleranceOf:item => Math.max(tolerance, (Number(item.width)||1)/1024),
    })?.stroke ?? null;
  }
  function commitMutation(slide, next) {
    const before = structuredClone(slide.drawings ?? []);
    if (JSON.stringify(before) === JSON.stringify(next)) return false;
    slide.drawings = structuredClone(next);
    hovered = null;
    refreshSlide(slide);
    onStrokeCommitted({ slideId: slide.id, before, after: structuredClone(next) });
    return true;
  }
  function setSelection(slide, item, toggle = false) {
    if (!toggle || selected?.slideId !== slide.id) selectedStrokeIds.clear();
    if (item) { if (toggle && selectedStrokeIds.has(item.id)) selectedStrokeIds.delete(item.id); else selectedStrokeIds.add(item.id); }
    const first = (slide.drawings ?? []).find(s => selectedStrokeIds.has(s.id));
    selected = first ? {slideId:slide.id, strokeId:first.id} : null;
    onSelectionChanged(selected ? { ...selected, count:selectedStrokeIds.size, color:first.color, width:first.width } : null);
    refreshAll();
  }
  function copySelection() {
    if (!selected) return [];
    const slide=getSlides().find(s=>s.id===selected.slideId);
    return slide ? copySelectedStrokes(slide.drawings??[],s=>selectedStrokeIds.has(s.id)) : [];
  }
  function pasteSelection(clipboard, offset={u:0.025,v:0.025}) {
    const slide=getSlides().find(s=>s.id===selected?.slideId) ?? null;
    if(!slide || !clipboard?.length) return false;
    const result=pasteStrokes(slide.drawings??[],clipboard,offset.u,offset.v,(_,i)=>`stroke-paste-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`);
    const changed=commitMutation(slide,result.strokes);
    if(changed){selectedStrokeIds.clear();result.pasted.forEach(s=>selectedStrokeIds.add(s.id));setSelection(slide,result.pasted[0],true);}
    return changed;
  }
  function moveSelection(dx,dy) {
    if(!selected || (!dx&&!dy))return false;
    const slide=getSlides().find(s=>s.id===selected.slideId);
    return slide ? commitMutation(slide,translateSelectedStrokes(slide.drawings??[],s=>selectedStrokeIds.has(s.id),dx,dy)) : false;
  }
  function transformSelection({angleDeg=0,scale=1}={}) {
    if (!selected) return false;
    const slide=getSlides().find(s=>s.id===selected.slideId);
    if (!slide) return false;
    const next=transformSelectedStrokes(slide.drawings??[],item=>selectedStrokeIds.has(item.id),{
      angleDeg,scale,aspectX:WIDTH/HEIGHT,pointOf:p=>({x:p[0],y:p[1]}),fromPoint:(pos)=>[pos.x,pos.y]
    });
    return commitMutation(slide,next);
  }
  function deleteSelected() {
    if (!selected) return false;
    const slide = getSlides().find(s => s.id === selected.slideId);
    if (!slide) { selected = null; return false; }
    const result = commitMutation(slide, withoutStroke(slide.drawings ?? [], s => selectedStrokeIds.has(s.id)));
    setSelection(slide, null);
    return result;
  }
  function updateSelected({color,width}) {
    if (!selected) return false;
    const slide = getSlides().find(s => s.id === selected.slideId);
    if (!slide) return false;
    return commitMutation(slide, withStrokeStyle(slide.drawings ?? [], item => selectedStrokeIds.has(item.id), {color,width}));
  }
  function pointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const hit = pick(event);
    stroke = null;
    if (getTool() === "eraser" && getEraserMode() === "partial") {
      eraserGesture = hit ? { slide:hit.slide, before:structuredClone(hit.slide.drawings ?? []), previous:hit.uv } : null;
      if (hit) eraseAt(hit.slide,hit.uv);
      return;
    }
    if (!hit) { if (getTool() === "select" && !(event.ctrlKey || event.metaKey)) clearSelection(); return; }
    if (getTool() === "select" || getTool() === "eraser") {
      const match = nearestStroke(hit.slide, hit.uv);
      if (getTool() === "select") {
        // Handles work even outside the stroke hit target; keep Ctrl-click toggling unchanged.
        if (selected?.slideId===hit.slide.id && selectedStrokeIds.size && !(event.ctrlKey||event.metaKey)) {
          const pts=(hit.slide.drawings||[]).filter(s=>selectedStrokeIds.has(s.id)).flatMap(s=>s.points||[]);
          if (pts.length) {
            const xs=pts.map(p=>p[0]*WIDTH),ys=pts.map(p=>p[1]*HEIGHT);
            const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
            const x=hit.uv.u*WIDTH,y=hit.uv.v*HEIGHT,cx=(left+right)/2;
            let handleMode=null;
            if (Math.hypot(x-cx,y-(top-29))<=14) handleMode='rotate';
            else if (Math.hypot(x-(right+7),y-(bottom+7))<=14) handleMode='scale';
            if (handleMode) {
              const before=structuredClone(hit.slide.drawings??[]);
              const center=selectedStrokeCenter(before,item=>selectedStrokeIds.has(item.id),pt=>({x:pt[0],y:pt[1]}),WIDTH/HEIGHT);
              moveGesture={slide:hit.slide,start:hit.uv,before,moved:false,mode:handleMode,center};
              return;
            }
          }
        }
        if (match && selected?.slideId===hit.slide.id && selectedStrokeIds.has(match.id) && !(event.ctrlKey||event.metaKey)) {
          const mode="move";
          const before=structuredClone(hit.slide.drawings??[]);
          const center=selectedStrokeCenter(before,item=>selectedStrokeIds.has(item.id),pt=>({x:pt[0],y:pt[1]}),WIDTH/HEIGHT);
          moveGesture={slide:hit.slide,start:hit.uv,before,moved:false,mode,center};
        } else setSelection(hit.slide,match,!!(event.ctrlKey||event.metaKey));
      }
      else if (match) {
        commitMutation(hit.slide, (hit.slide.drawings ?? []).filter(item => item.id !== match.id));
        if (selected?.slideId === hit.slide.id && selectedStrokeIds.has(match.id)) clearSelection();
      }
      return;
    }
    const layer = ensureLayer(hit.slide);
    stroke = { slide: hit.slide, mesh: hit.slide.mesh, layer, points: [hit.uv], color: getColor(), width: getWidth(), kind: getStyle() === "neon" ? "neon" : "standard", strength: getGlowStrength() };
    if (stroke.kind === "neon") renderStrokes(layer, hit.slide.drawings);
    else drawSegment(layer, hit.uv, hit.uv, stroke.color, stroke.width);
  }
  function eraseAt(slide, uv) {
    const originals = slide.drawings ?? [];
    const after = erasePolylineAt(originals, {x:uv.u*WIDTH,y:uv.v*HEIGHT}, getEraserRadius(), {
      pointOf:p=>({x:p[0]*WIDTH,y:p[1]*HEIGHT}),
      makePoint:p=>[p.x/WIDTH,p.y/HEIGHT],
      idFor:(item,i)=>`${item.id}-cut-${Date.now()}-${i}`,
    });
    if (after === originals) return;
    slide.drawings=after; selected=null; hovered=null; onSelectionChanged(null);refreshSlide(slide);
  }
  function pointerMove(event) {
    if(moveGesture){
      const hit=pick(event);
      if(hit?.slide.id===moveGesture.slide.id){
        const du=hit.uv.u-moveGesture.start.u,dv=hit.uv.v-moveGesture.start.v;
        if(du||dv){
          if (moveGesture.mode==='move') {
            moveGesture.slide.drawings=translateSelectedStrokes(moveGesture.slide.drawings??[],s=>selectedStrokeIds.has(s.id),du,dv);
            moveGesture.start=hit.uv;
          } else {
            const from={x:moveGesture.start.u*WIDTH/HEIGHT,y:moveGesture.start.v};
            const to={x:hit.uv.u*WIDTH/HEIGHT,y:hit.uv.v};
            const options=dragTransform(moveGesture.center,from,to,moveGesture.mode);
            moveGesture.slide.drawings=transformSelectedStrokes(moveGesture.before,s=>selectedStrokeIds.has(s.id),{
              ...options,aspectX:WIDTH/HEIGHT,pointOf:p=>({x:p[0],y:p[1]}),fromPoint:pos=>[pos.x,pos.y]
            });
          }
          moveGesture.moved=true;refreshSlide(moveGesture.slide);
        }
      }
      return;
    }
    if (eraserGesture) {
      const hit = pick(event);
      if (hit?.slide.id===eraserGesture.slide.id) {
        const a=eraserGesture.previous,b=hit.uv;
        const steps=Math.max(1,Math.ceil(Math.hypot((b.u-a.u)*WIDTH,(b.v-a.v)*HEIGHT)/Math.max(3,getEraserRadius()/2)));
        for(let i=1;i<=steps;i++) eraseAt(hit.slide,{u:a.u+(b.u-a.u)*i/steps,v:a.v+(b.v-a.v)*i/steps});
        eraserGesture.previous=b;
      }
      return;
    }
    if (!stroke) {
      const tool = getTool();
      const hit = (tool === "select" || tool === "eraser") ? pick(event) : null;
      const match = hit ? nearestStroke(hit.slide, hit.uv) : null;
      const next = match ? { slideId: hit.slide.id, strokeId: match.id } : null;
      if (JSON.stringify(next) !== JSON.stringify(hovered)) {
        hovered = next;
        refreshAll();
      }
      return;
    }
    const hit = pick(event);
    // Do not transfer a stroke across slides or the space outside a slide.
    if (!hit || hit.slide.mesh !== stroke.mesh) return;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(hit.uv);
    if (stroke.kind === "neon") renderStrokes(stroke.layer, stroke.slide.drawings);
    else metrics.measure("slide.liveSegment", () => renderStrokes(stroke.layer, stroke.slide.drawings));
  }
  function pointerUp() {
    if(moveGesture){
      const {slide,before,moved}=moveGesture;moveGesture=null;
      if(moved){const after=structuredClone(slide.drawings??[]);onStrokeCommitted({slideId:slide.id,before,after});}
      return;
    }
    if (eraserGesture) {
      const {slide,before}=eraserGesture; eraserGesture=null;
      const after=structuredClone(slide.drawings??[]);
      if (JSON.stringify(before)!==JSON.stringify(after)) onStrokeCommitted({slideId:slide.id,before,after});
      return;
    }
    const completed = stroke;
    stroke = null;
    if (!completed) return;
    const slide = completed.slide;
    if (completed.kind === "neon") {
      transientNeon.push({ slideId: slide.id, color: completed.color, width: completed.width,
        strength: completed.strength, points: completed.points.map(({u,v}) => [u,v]),
        startedAt: performance.now(), fadeMs: Math.max(100, Number(getFadeSeconds()) * 1000) });
      renderStrokes(completed.layer, slide.drawings);
      if (neonTimer === null) neonTimer = setInterval(() => {
        const now = performance.now();
        for (let i = transientNeon.length - 1; i >= 0; i--) {
          if (now - transientNeon[i].startedAt >= transientNeon[i].fadeMs) transientNeon.splice(i, 1);
        }
        for (const layer of layers.values()) if (!layer.overlay.isDisposed()) renderStrokes(layer, layer.slide.drawings);
        if (!transientNeon.length) { clearInterval(neonTimer); neonTimer = null; }
      }, 50);
      return;
    }
    const before = structuredClone(slide.drawings ?? []);
    const item = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: "standard", color: completed.color, width: completed.width,
      points: completed.points.map(({u, v}) => [u, v]),
    };
    slide.drawings = [...before, item];
    // Rebuild from canonical strokes immediately: do not keep an independent
    // preview texture that can reappear when the drawing mode is toggled.
    refreshSlide(slide);
    onStrokeCommitted({slideId: slide.id, before, after: structuredClone(slide.drawings)});
  }
  function clearSelected(slideIds) {
    stroke = null;
    const ids = new Set(slideIds);
    const changes = [];
    for (const slide of getSlides()) {
      if (!ids.has(slide.id) || !slide.drawings?.length) continue;
      changes.push({slideId: slide.id, before: structuredClone(slide.drawings), after: []});
      slide.drawings = [];
      refreshSlide(slide);
    }
    if (changes.length) onClearCommitted(changes);
    return changes.length;
  }
  function clear() {
    // Clearing does not commit a partially-drawn stroke.
    stroke = null;
    transientNeon.length = 0;
    if (neonTimer !== null) { clearInterval(neonTimer); neonTimer = null; }
    const changes = [];
    for (const slide of getSlides()) {
      if (!slide.drawings?.length) continue;
      changes.push({slideId: slide.id, before: structuredClone(slide.drawings), after: []});
      slide.drawings = [];
    }
    for (const layer of layers.values()) {
      if (layer.overlay.isDisposed()) continue;
      layer.ctx.clearRect(0, 0, WIDTH, HEIGHT);
      layer.texture.update();
    }
    if (changes.length) onClearCommitted(changes);
  }
  return { pointerDown, pointerMove, pointerUp, clear, clearSelected, refreshSlide, refreshAll, deleteSelected, updateSelected, clearSelection, getSelection, copySelection, pasteSelection, moveSelection, transformSelection, setHighlightPulse, diagnostics: metrics };
}
