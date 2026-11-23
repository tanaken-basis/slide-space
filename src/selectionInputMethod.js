// The shared editor calls translation "position", while the legacy relative
// movement controls are keyed "move". Keep their names in one adapter.
export function relativeInputKey(mode) {
  return mode === 'position' ? 'move' : mode;
}
// Scene-3L: derive an operation for each independent combination of target and input method.
export function absoluteToRelative(mode, desired, reference) {
  if (!Array.isArray(desired) || !Array.isArray(reference) || desired.length !== 3 || reference.length !== 3 ||
      [...desired, ...reference].some(v => !Number.isFinite(v))) return null;
  if (mode === 'scale') {
    if (reference.some(v => v <= 0) || desired.some(v => v <= 0)) return null;
    return desired.map((v, i) => v / reference[i]);
  }
  if (mode === 'position' || mode === 'rotation') return desired.map((v, i) => v - reference[i]);
  return null;
}
export const relativeIdentity = mode => mode === 'scale' ? [1, 1, 1] : [0, 0, 0];
export function absoluteTargetFromDelta(mode, current, relative) {
  if (!Array.isArray(current) || !Array.isArray(relative) || current.length!==3 || relative.length!==3) return null;
  return mode === 'scale' ? current.map((v,i)=>v*relative[i]) : current.map((v,i)=>v+relative[i]);
}
