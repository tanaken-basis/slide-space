/**
 * Quaternion math shared by World/Local rotation editors.
 * Representation is [x,y,z,w], normalized; no Babylon scene dependency.
 * World rotations pre-multiply the existing orientation; local rotations post-multiply.
 */
export function normalizeRotation(q) {
  if (!Array.isArray(q) || q.length !== 4 || !q.every(Number.isFinite)) throw new TypeError('Invalid quaternion');
  const length = Math.hypot(...q);
  if (length < 1e-12) throw new RangeError('Zero-length quaternion');
  return q.map(v => v / length);
}
export function multiplyRotations(a, b) {
  const [x1, y1, z1, w1] = a;
  const [x2, y2, z2, w2] = b;
  return normalizeRotation([
    w1*x2+x1*w2+y1*z2-z1*y2,
    w1*y2-x1*z2+y1*w2+z1*x2,
    w1*z2+x1*y2-y1*x2+z1*w2,
    w1*w2-x1*x2-y1*y2-z1*z2,
  ]);
}
export function axisAngleRotation(axis, degrees) {
  if (!['pitch', 'yaw', 'roll'].includes(axis) || !Number.isFinite(degrees)) throw new TypeError('Invalid rotation axis/angle');
  const s = Math.sin(degrees * Math.PI / 360);
  const c = Math.cos(degrees * Math.PI / 360);
  return axis === 'pitch' ? [s,0,0,c] : axis === 'yaw' ? [0,s,0,c] : [0,0,s,c];
}
export function rotateAroundAxis(q, axis, degrees, mode='world') {
  const before = normalizeRotation(q);
  const delta = axisAngleRotation(axis, degrees);
  if (mode === 'world') return multiplyRotations(delta, before);
  if (mode === 'local') return multiplyRotations(before, delta);
  throw new TypeError('Rotation mode must be world or local');
}
