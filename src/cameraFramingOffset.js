/** Camera-2A: project-wide off-axis framing, independent of camera pose. */
export const DEFAULT_CAMERA_FRAMING_OFFSET = Object.freeze({ horizontal: 0, vertical: 0 });
export function normalizeCameraFramingOffset(value) {
  const v = value && typeof value === 'object' ? value : {};
  const axis = name => {
    const n = Number(v[name]);
    return Number.isFinite(n) ? Math.min(0.8, Math.max(-0.8, n)) : 0;
  };
  return { horizontal: axis('horizontal'), vertical: axis('vertical') };
}
/**
 * Shift the perspective projection's principal point (NDC units).
 * Camera position, rotation, fov and all slide camera poses stay unchanged.
 * Restore the old shift before writing the new one because Babylon may reuse
 * the same mutable Matrix when the projection cache has not been invalidated.
 */
export function installCameraFramingOffset(camera, readOffset) {
  const original = camera.getProjectionMatrix;
  let appliedMatrix = null;
  let previousX = 0;
  let previousY = 0;
  camera.getProjectionMatrix = function (...args) {
    const before = appliedMatrix ? [appliedMatrix.m[8], appliedMatrix.m[9], appliedMatrix.m[12], appliedMatrix.m[13]] : null;
    const matrix = original.apply(this, args);
    // Forced projection refresh or resize may overwrite the cached matrix in place.
    const rebuilt = before && (matrix.m[8] !== before[0] || matrix.m[9] !== before[1] || matrix.m[12] !== before[2] || matrix.m[13] !== before[3]);
    if (matrix !== appliedMatrix || rebuilt) {
      appliedMatrix = matrix;
      previousX = 0;
      previousY = 0;
    }
    if (this.mode !== undefined && this.ORTHOGRAPHIC_CAMERA !== undefined && this.mode === this.ORTHOGRAPHIC_CAMERA) {
      // Orthographic projection uses translation slots instead of perspective skew.
      matrix.m[12] -= previousX;
      matrix.m[13] -= previousY;
      const next = normalizeCameraFramingOffset(readOffset());
      matrix.m[12] += next.horizontal;
      matrix.m[13] += next.vertical;
      previousX = next.horizontal;
      previousY = next.vertical;
    } else {
      matrix.m[8] -= previousX;
      matrix.m[9] -= previousY;
      const next = normalizeCameraFramingOffset(readOffset());
      matrix.m[8] += next.horizontal;
      matrix.m[9] += next.vertical;
      previousX = next.horizontal;
      previousY = next.vertical;
    }
    return matrix;
  };
  return () => { camera.getProjectionMatrix = original; };
}
