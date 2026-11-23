// Project-level Asset Library. Scene placement is stored separately in scenePresets[].assets.
const supported = /\.(glb|spz)$/i;
export const normalizeAssetLibrary = value => {
  if (!Array.isArray(value)) return null; // null = older project, not migrated yet
  const paths = new Set();
  return value.flatMap(item => {
    const path = typeof item === 'string' ? item : item?.path;
    if (typeof path !== 'string' || !/^assets\/[^/\\]+$/i.test(path) || !supported.test(path) || paths.has(path)) return [];
    paths.add(path);
    const type = path.toLowerCase().endsWith('.spz') ? 'spz' : 'glb';
    return [{path, type, label: (typeof item === 'object' && typeof item?.label === 'string' && item.label.trim()) || path.slice(7)}];
  });
};
export const registerAssets = (registry, detected) => normalizeAssetLibrary([
  ...(Array.isArray(registry) ? registry : []),
  ...detected.map(item => ({path:item.path,type:item.type,label:item.name ?? item.path.slice(7)})),
]);
export const unregisterAsset = (registry, path) => normalizeAssetLibrary(registry).filter(item => item.path !== path);

// Only the display label changes: storage paths and Scene placements remain untouched.
export const renameAsset = (registry, path, label) => {
  const clean = typeof label === 'string' ? label.trim() : '';
  if (!clean || clean.length > 160) return null;
  const items = normalizeAssetLibrary(registry);
  if (!items?.some(item => item.path === path)) return null;
  return items.map(item => item.path === path ? {...item, label: clean} : item);
};

// The filename is a stable identity cue even when the Library label changes.
export const assetFilename = path => String(path ?? '').split(/[\\/]/).pop() || '';
export const assetDisplayWithFilename = (label, path) => {
  const filename = assetFilename(path);
  return `${label || filename} (${filename})`;
};
export const placedAssetDisplay = (asset, library) => {
  const path = asset?.src ?? '';
  const registered = Array.isArray(library) ? library.find(entry => entry.path === path) : null;
  const name = assetDisplayWithFilename(registered?.label || assetFilename(path) || asset?.type || 'Asset', path);
  return `${asset?.id ?? 'Asset'} — ${name}`;
};
