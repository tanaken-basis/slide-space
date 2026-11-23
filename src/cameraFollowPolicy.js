/** Editor-only viewport policy: follow a saved Slide camera edit only when
 * the viewer was already standing near that Slide's *previous* camera pose.
 * No project data or camera transform is changed by this pure predicate.
 */
export function shouldFollowSlideCameraView(viewPosition, previousCameraPosition, slideDistance) {
  if (!Array.isArray(viewPosition) || !Array.isArray(previousCameraPosition) ||
      viewPosition.length < 3 || previousCameraPosition.length < 3) return false;
  const coords = [...viewPosition.slice(0,3),...previousCameraPosition.slice(0,3)];
  if (!coords.every(Number.isFinite)) return false;
  const threshold = Math.max(0.6, Math.min(2, (Number.isFinite(slideDistance) && slideDistance > 0 ? slideDistance : 1) * 0.15));
  const distance = Math.hypot(...[0,1,2].map(i=>viewPosition[i]-previousCameraPosition[i]));
  return distance <= threshold;
}
