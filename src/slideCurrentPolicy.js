/** Current is independent of Selection. All arguments are plain slide IDs. */
export function preserveCurrentAfterInsertion(currentId, slidesAfter) {
  const ids = new Set(slidesAfter.map(slide => slide.id));
  return currentId != null && ids.has(currentId) ? currentId : (slidesAfter[0]?.id ?? null);
}

/** Keep Current if present. Otherwise prefer the nearest surviving predecessor
 * in the ORIGINAL slide order, falling forward only when none survives. */
export function chooseCurrentAfterDeletion(originalIds, deletedIds, currentId) {
  const deleted = new Set(deletedIds);
  const remaining = originalIds.filter(id => !deleted.has(id));
  if (!remaining.length) return null;
  if (currentId != null && !deleted.has(currentId) && remaining.includes(currentId)) return currentId;
  const at = originalIds.indexOf(currentId);
  if (at < 0) return remaining[0];
  for (let i = at - 1; i >= 0; i--) if (!deleted.has(originalIds[i])) return originalIds[i];
  for (let i = at + 1; i < originalIds.length; i++) if (!deleted.has(originalIds[i])) return originalIds[i];
  return null;
}
