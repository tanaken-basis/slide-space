// Drawing-7C: immutable geometry operations shared by slide UV and screen pixels.
export function translateSelectedStrokes(strokes, predicate, dx, dy) {
  return strokes.map((stroke, index) => predicate(stroke,index) ? { ...stroke, points: stroke.points.map(p => Array.isArray(p) ? [p[0]+dx,p[1]+dy] : { ...p,x:p.x+dx,y:p.y+dy }) } : stroke);
}
export function copySelectedStrokes(strokes, predicate) {
  return structuredClone(strokes.filter(predicate));
}
export function pasteStrokes(strokes, clipboard, dx, dy, makeId) {
  const copied=translateSelectedStrokes(clipboard,()=>true,dx,dy).map((item,i)=>({...item,id:makeId(item,i)}));
  return {strokes:[...strokes,...copied], pasted:copied};
}
