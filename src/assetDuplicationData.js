// Create new instances of placed Assets without mutating their source configs.
// The same spatial offset is applied to every selection so relative spacing stays fixed.
export function createAssetDuplicateEntries(selected, createId, offset = [1, 0, 0]) {
  if (!Array.isArray(selected) || typeof createId !== 'function') return [];
  const seen = new Set();
  return selected.flatMap(({presetName, asset}) => {
    if (!presetName || !asset?.id) return [];
    const key = JSON.stringify([presetName, asset.id]);
    if (seen.has(key)) return [];
    seen.add(key);
    const copy = structuredClone(asset);
    copy.id = createId(asset.id);
    const position = copy.transform?.position;
    if (Array.isArray(position) && position.length >= 3) {
      copy.transform.position = position.slice();
      for (let axis = 0; axis < 3; axis++) {
        copy.transform.position[axis] = Number(position[axis] || 0) + Number(offset[axis] || 0);
      }
    }
    return [{ presetName, sourceId: asset.id, assetConfig: copy }];
  });
}
