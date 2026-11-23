import { safeLocalWebPath } from './slideInteraction.js';

// Browsers don't grant an HTTP origin for arbitrary user-picked folders.
// Package linked local resources as blob URLs at click time. No server is started.
// Supports ordinary static sites and many module-based, pre-built web apps.
const mime = ext => ({html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',json:'application/json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',wasm:'application/wasm'})[ext] || 'application/octet-stream';

export function resolveLocalWebReference(sourcePath, reference) {
  if (typeof reference !== 'string' || !reference.trim()) return null;
  const ref = reference.trim();
  if (ref.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(ref) || ref.includes('?') || ref.includes('#')) return null;
  const path = sourcePath.split('/').slice(0, -1);
  for (const part of ref.replaceAll('\\', '/').split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') { if (path.length <= 1) return null; path.pop(); }
    else path.push(part);
  }
  if (path[0] !== 'web' || path.length < 2) return null;
  return path.join('/');
}

async function fileAt(root, path) {
  let dir = root;
  const parts = path.split('/');
  for (const segment of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(segment);
  return (await dir.getFileHandle(parts.at(-1))).getFile();
}

export async function createLocalWebPageUrl(root, entryPath) {
  const entry = safeLocalWebPath(entryPath);
  if (!root || !entry) throw new Error('Invalid local Web entry');
  const cache = new Map();
  const pending = new Set();
  const urls = [];
  const limit = 250;

  async function convert(path) {
    if (cache.has(path)) return cache.get(path);
    if (pending.has(path)) throw new Error(`Circular local resource: ${path}`);
    if (cache.size + pending.size > limit) throw new Error('Too many web resources');
    pending.add(path);
    try {
      const file = await fileAt(root, path);
      const ext = path.split('.').at(-1).toLowerCase();
      let blob = file;
      if (['html','htm','css','js','mjs'].includes(ext)) {
        let content = await file.text();
        async function replaceAsync(pattern, processor) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches.reverse()) {
            const replacement = await processor(match);
            if (replacement !== null) content = content.slice(0,match.index)+replacement+content.slice(match.index+match[0].length);
          }
        }
        if (ext === 'html' || ext === 'htm') {
          // Elements that embed files or navigate to another local HTML page.
          await replaceAsync(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi, async m => {
            const target = resolveLocalWebReference(path, m[3]);
            if (!target) return null;
            return `${m[1]}=${m[2]}${await convert(target)}${m[2]}`;
          });
        } else if (ext === 'css') {
          await replaceAsync(/url\(\s*(["']?)([^)'" ]+)\1\s*\)/gi, async m => {
            const target = resolveLocalWebReference(path, m[2]);
            return target ? `url("${await convert(target)}")` : null;
          });
          await replaceAsync(/@import\s+(["'])([^"']+)\1/gi, async m => {
            const target = resolveLocalWebReference(path, m[2]);
            return target ? `@import "${await convert(target)}"` : null;
          });
        } else {
          // Rewrite relative ESM imports; bare imports are left untouched.
          await replaceAsync(/(\b(?:from\s*|import\s*\(\s*|import\s*|fetch\s*\(\s*))(["'])([^"']+)\2/g, async m => {
            const target = resolveLocalWebReference(path, m[3]);
            return target ? `${m[1]}${m[2]}${await convert(target)}${m[2]}` : null;
          });
        }
        blob = new Blob([content], {type: mime(ext)});
      }
      const url = URL.createObjectURL(blob);
      urls.push(url);
      cache.set(path, url);
      return url;
    } finally { pending.delete(path); }
  }
  try {
    const url = await convert(entry);
    // Keep blob resources alive for navigation; browsers revoke on page unload.
    // The caller's window is distinct, and its lifetime may outlast the editor.
    return url;
  } catch (error) {
    for (const url of urls) URL.revokeObjectURL(url);
    throw error;
  }
}
