// Editor-only spatial helpers. No project data or scene resources are modified here.
export function findNonOverlappingOffset(position, otherPositions, rightDirection, {minDistance = 1.45, step = 1.9, maxSteps = 24} = {}) {
  const right = rightDirection.clone();
  if (right.lengthSquared() < 1e-8) right.set(1,0,0);
  right.normalize();
  let candidate = position.clone();
  for (let n=0; n<=maxSteps; n++) {
    const blocked = otherPositions.some(other => other && candidate.subtract(other).lengthSquared() < minDistance*minDistance);
    if (!blocked) return candidate.subtract(position);
    candidate = position.add(right.scale(step*(n+1)));
  }
  return candidate.subtract(position);
}

export function getEditorGuideSignature(slides) {
  return slides.map(s => [s.id, s.position?.x, s.position?.y, s.position?.z,
    s.cameraPosition?.x, s.cameraPosition?.y, s.cameraPosition?.z].join(':')).join('|');
}
