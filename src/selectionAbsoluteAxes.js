// Scene-3N: shared mixed-value and absolute-axis semantics for Slide/Asset selections.
export function commonAbsoluteAxes(items, mode, tolerance = 1e-5) {
  if (!items.length) return null;
  return [0, 1, 2].map(axis => {
    const first = items[0][mode][axis];
    const matches = items.every(item => {
      const n = item[mode][axis];
      if (mode === 'rotation') {
        const difference = ((n - first + 180) % 360 + 360) % 360 - 180;
        return Math.abs(difference) < tolerance;
      }
      return Math.abs(n - first) < tolerance;
    });
    return matches ? first : null;
  });
}
export function assignAbsoluteAxes(before, assignments, { linkScale = false } = {}) {
  const result = before.slice();
  const axes = Object.keys(assignments).map(Number);
  for (const axis of axes) {
    const n = assignments[axis];
    if (!Number.isFinite(n)) throw new RangeError('Nonfinite absolute value');
    result[axis] = n;
  }
  if (linkScale && axes.length === 1) {
    const axis = axes[0];
    if (!(before[axis] > 0) || !(result[axis] > 0)) throw new RangeError('Invalid scale');
    const factor = result[axis] / before[axis];
    return before.map(n => n * factor);
  }
  return result;
}
