// Drawing-7E: drag gesture about the centre of the selected group in physical coordinates.
// In slide UV, aspectX = slide width / slide height; in screen pixels aspectX = 1.
export function selectedStrokeCenter(strokes, predicate, pointOf = p => p, aspectX = 1) {
  const points = strokes.flatMap((line,i) => predicate(line,i) ? (line.points ?? []).map(pointOf) : []);
  if (!points.length) return null;
  const xs=points.map(p=>p.x*aspectX), ys=points.map(p=>p.y);
  return {x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
}
export function dragTransform(center, start, current, mode, {minimumRadius=0.001}={}) {
  if (!center || !start || !current) return {angleDeg:0,scale:1};
  const a={x:start.x-center.x,y:start.y-center.y};
  const b={x:current.x-center.x,y:current.y-center.y};
  const ra=Math.hypot(a.x,a.y),rb=Math.hypot(b.x,b.y);
  if (ra < minimumRadius) return {angleDeg:0,scale:1};
  if (mode==='rotate') return {angleDeg:(Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x))*180/Math.PI,scale:1};
  if (mode==='scale') return {angleDeg:0,scale:Math.max(0.05,Math.min(10,rb/ra))};
  return {angleDeg:0,scale:1};
}

// Drawing-6B: geometry and immutable stroke-list operations shared by both drawing surfaces.
// Callers provide coordinate conversion and hit tolerance; this module has no Canvas,
// Babylon, editor-history, or persistence dependencies.
export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x-a.x)*dx + (point.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(point.x-a.x-t*dx, point.y-a.y-t*dy);
}
export function findNearestStroke(strokes, point, { pointOf = p => p, toleranceOf = () => 8, reverse = true } = {}) {
  let winner = null;
  let nearest = Infinity;
  const indices = Array.from({length:strokes.length}, (_, i) => i);
  if (reverse) indices.reverse();
  for (const index of indices) {
    const stroke = strokes[index];
    const pts = stroke?.points ?? [];
    if (!pts.length) continue;
    const limit = toleranceOf(stroke);
    for (let k=0;k<pts.length;k++) {
      const d = distanceToSegment(point, pointOf(pts[k]), pointOf(pts[Math.min(k+1,pts.length-1)]));
      if (d <= limit && (reverse ? winner === null : d < nearest)) {
        winner = { stroke, index, distance:d }; nearest=d;
      }
    }
    if (reverse && winner !== null) break;
  }
  return winner;
}
export function withoutStroke(strokes, predicate) {
  return strokes.filter((stroke, index) => !predicate(stroke, index));
}
export function withStrokeStyle(strokes, predicate, { color, width } = {}) {
  return strokes.map((stroke, index) => !predicate(stroke, index) ? stroke : {
    ...stroke,
    color: color || stroke.color,
    width: Number.isFinite(Number(width)) && Number(width) > 0 ? Number(width) : stroke.width,
  });
}


// Drawing-7A: erase the circular footprint from polylines, returning separate
// immutable fragments. Works in caller-supplied coordinates (UV or pixels).
// Dense interpolation prevents a fast cursor from tunnelling across long segments.
export function erasePolylineAt(strokes, center, radius, { pointOf = p => p,
  makePoint = p => p, idFor = (stroke, index) => `${stroke.id}-part-${index}`,
  minStep = Math.max(radius / 3, 0.0001) } = {}) {
  if (!Number.isFinite(radius) || radius <= 0) return strokes;
  let changed = false;
  const result = [];
  for (const item of strokes) {
    const points = item?.points ?? [];
    if (!points.length) { result.push(item); continue; }
    const runs = [];
    let run = [];
    const flush = () => { if (run.length) { runs.push(run); run = []; } };
    const visit = p => {
      const inside = Math.hypot(p.x-center.x, p.y-center.y) <= radius;
      if (inside) { changed = true; flush(); }
      else if (!run.length || Math.hypot(p.x-pointOf(run[run.length-1]).x, p.y-pointOf(run[run.length-1]).y) > 1e-10) run.push(makePoint(p));
    };
    for (let i=0;i<points.length;i++) {
      const a = pointOf(points[i]);
      if (i===0) { visit(a); continue; }
      const b = pointOf(points[i-1]);
      const n = Math.max(1, Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/minStep));
      for (let k=1;k<=n;k++) visit({x:b.x+(a.x-b.x)*k/n,y:b.y+(a.y-b.y)*k/n});
    }
    flush();
    if (runs.length===1 && runs[0].length && !points.some(pt => Math.hypot(pointOf(pt).x-center.x,pointOf(pt).y-center.y)<=radius) &&
        !runs.some(r=>r.length===0) && runs[0].length>=points.length) {
      // The resampled polyline may be equivalent to the input; leave it untouched.
      const crosses = points.some((pt,i)=>i>0 && distanceToSegment(center,pointOf(points[i-1]),pointOf(pt))<=radius);
      if (!crosses) { result.push(item); continue; }
    }
    if (!runs.length) continue;
    if (runs.length===1 && !points.some((pt,i)=>i>0 && distanceToSegment(center,pointOf(points[i-1]),pointOf(pt))<=radius)
        && Math.hypot(pointOf(points[0]).x-center.x,pointOf(points[0]).y-center.y)>radius) {
      result.push(item); continue;
    }
    runs.forEach((pts,index)=>result.push({...item,id:idFor(item,index),points:pts}));
  }
  return changed ? result : strokes;
}

// Drawing-7D: immutable group transformation about the common bounding-box centre.
// pointOf/fromPoint allow UV arrays and screen-space {x,y} points to share maths.
export function transformSelectedStrokes(strokes, predicate, { angleDeg = 0, scale = 1,
  pointOf = p => p, fromPoint = (point) => point, aspectX = 1 } = {}) {
  const indices = strokes.map((item, index) => predicate(item, index) ? index : -1).filter(i => i >= 0);
  if (!indices.length || !Number.isFinite(angleDeg) || !Number.isFinite(scale) || scale <= 0) return strokes;
  const points = indices.flatMap(index => (strokes[index].points || []).map(pointOf));
  if (!points.length) return strokes;
  const factor = Number.isFinite(aspectX) && aspectX > 0 ? aspectX : 1;
  const xs=points.map(p=>p.x*factor), ys=points.map(p=>p.y);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
  const a=angleDeg*Math.PI/180, c=Math.cos(a), sn=Math.sin(a);
  return strokes.map((stroke, index) => !predicate(stroke,index) ? stroke : ({
    ...stroke,
    points: (stroke.points||[]).map(pt => {
      const pos=pointOf(pt), x=(pos.x*factor-cx)*scale, y=(pos.y-cy)*scale;
      return fromPoint({x:(cx+x*c-y*sn)/factor,y:cy+x*sn+y*c},pt);
    })
  }));
}
