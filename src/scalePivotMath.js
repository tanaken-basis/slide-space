/**
 * Scale a world-space position about a fixed pivot.
 * Positions and factors are XYZ triples; the focused object stays on the pivot.
 * No Babylon dependency so this rule can be tested independently.
 */
export function scalePositionAboutPivot(position, pivot, factors, mode = 'group') {
  if (mode === 'individual') return [...position];
  return position.map((value, i) => pivot[i] + (value - pivot[i]) * factors[i]);
}

/** A scale ratio acts on the object's existing dimensions, not a shared size. */
export function multiplyScale(scale, factors) {
  return scale.map((value, i) => value * factors[i]);
}

/** The stored camera follows the translation of its slide. */
export function followSlideTranslation(cameraPosition, oldPosition, newPosition) {
  return cameraPosition.map((value, i) => value + newPosition[i] - oldPosition[i]);
}
