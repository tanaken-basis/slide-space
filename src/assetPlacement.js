/** Compute an Asset's initial world position without mutating the camera. */
export function initialAssetPosition(mode, cameraPosition, cameraForward, distance) {
  if (mode === 'origin') return [0, 0, 0];
  const valid = [...cameraPosition, ...cameraForward, distance].every(Number.isFinite);
  const norm = Math.hypot(...cameraForward);
  if (!valid || norm < 1e-8 || distance <= 0) return [0, 0, 0];
  return cameraPosition.map((v, index) => v + cameraForward[index] * distance / norm);
}
