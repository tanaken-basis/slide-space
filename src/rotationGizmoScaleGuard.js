// Babylon.js cannot match RotationGizmo handles to the attached node's
// local orientation when its world-space scaling is non-uniform.
export function canMatchLocalRotation(worldScale, epsilon = 1e-4) {
  if (!worldScale) return true; // detached gizmo
  const values = [worldScale.x, worldScale.y, worldScale.z].map(Math.abs);
  if (!values.every(Number.isFinite)) return false;
  const largest = Math.max(1, ...values);
  return Math.abs(values[0] - values[1]) <= epsilon * largest &&
    Math.abs(values[1] - values[2]) <= epsilon * largest;
}
