// Audio library metadata and discovery. No filesystem writes occur here.
const TYPES = new Set(['bgm', 'sfx']);
const EXT = /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i;
export function classifyAudioPath(path) {
  const normalized = String(path).replace(/\\/g, '/');
  return /^sound\/bgm\//i.test(normalized) ? 'bgm' : 'sfx';
}
export function normalizeAudioAssets(audioAssets = {}, legacySoundAssets = {}) {
  const result = {};
  for (const [id, path] of Object.entries(legacySoundAssets || {})) {
    if (typeof path === 'string' && path) result[id] = {path, type: classifyAudioPath(path), label: id};
  }
  for (const [id, input] of Object.entries(audioAssets || {})) {
    if (!input || typeof input !== 'object' || typeof input.path !== 'string' || !input.path) continue;
    result[id] = { path: input.path, type: TYPES.has(input.type) ? input.type : classifyAudioPath(input.path), label: typeof input.label === 'string' && input.label.trim() ? input.label : id };
  }
  return result;
}
export function audioAssetPaths(audioAssets) {
  return new Set(Object.values(audioAssets ?? {}).map(x => x?.path?.replace(/\\/g, '/').toLowerCase()).filter(Boolean));
}
export function makeAudioId(path, taken) {
  const name = path.split('/').pop().replace(/\.[^.]+$/, '').normalize('NFKC').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase() || 'AUDIO';
  const base = `${classifyAudioPath(path).toUpperCase()}_${name}`;
  let id = base, i = 2;
  while (taken.has(id)) id = `${base}_${i++}`;
  taken.add(id);
  return id;
}
export async function scanAudioDirectory(directoryHandle, existing = {}) {
  const found = [];
  const taken = new Set(Object.keys(existing));
  const knownPaths = audioAssetPaths(existing);
  async function visit(path, kind) {
    let handle;
    try { handle = await (async () => { const sound = await directoryHandle.getDirectoryHandle("sound"); return sound.getDirectoryHandle(kind); })(); }
    catch (err) { if (err?.name === 'NotFoundError') return; throw err; }
    for await (const [name, child] of handle.entries()) {
      if (child.kind !== 'file' || !EXT.test(name)) continue;
      const rel = `sound/${kind}/${name}`;
      if (knownPaths.has(rel.toLowerCase())) continue;
      found.push({id: makeAudioId(rel, taken), path: rel, type: kind, label: name.replace(/\.[^.]+$/, '')});
    }
  }
  await visit('bgm', 'bgm');
  await visit('sfx', 'sfx');
  return found.sort((a,b) => a.path.localeCompare(b.path));
}

export async function missingAudioAssets(directoryHandle, assets) {
  const missing = new Set();
  for (const [id, asset] of Object.entries(assets)) {
    try {
      const parts = asset.path.split('/').filter(Boolean);
      let folder = directoryHandle;
      for (const name of parts.slice(0,-1)) folder = await folder.getDirectoryHandle(name);
      await folder.getFileHandle(parts.at(-1));
    } catch (error) {
      if (error?.name === 'NotFoundError') missing.add(id);
      else throw error;
    }
  }
  return missing;
}

// Keep the old ID as a reference key in all preset/slide/project settings.
export function renameAudioReferences(value, from, to) {
  if (typeof value === 'string') return value === from ? to : value;
  if (Array.isArray(value)) return value.map(x => renameAudioReferences(x, from, to));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, renameAudioReferences(v,from,to)]));
  return value;
}
export function countAudioReferences(value, id) {
  if (typeof value === 'string') return Number(value === id);
  if (Array.isArray(value)) return value.reduce((n,x)=>n+countAudioReferences(x,id),0);
  if (value && typeof value === 'object') return Object.values(value).reduce((n,x)=>n+countAudioReferences(x,id),0);
  return 0;
}
