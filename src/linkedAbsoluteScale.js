/** Preserve initial XYZ proportions when one absolute scale component changes. */
export function linkedAbsoluteScale(previous, requested, axis, minScale=0.001) {
  if (!Array.isArray(previous) || !Array.isArray(requested) || previous.length!==3 || requested.length!==3 ||
      !Number.isInteger(axis) || axis<0 || axis>2 || previous.some(v=>!Number.isFinite(v)||v<=0) ||
      !Number.isFinite(requested[axis]) || requested[axis]<=0) return null;
  const ratio=requested[axis]/previous[axis];
  return previous.map(value=>Math.max(minScale,value*ratio));
}
