// Scene-4D: Only HTTP(S) remote URLs and safe paths inside web/ are accepted.
export function safeInteractionUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) return null;
    return parsed.href;
  } catch { return null; }
}
export function safeLocalWebPath(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().replaceAll('\\', '/');
  if (!raw || raw.startsWith('/') || raw.includes('?') || raw.includes('#') || raw.includes('://') || /[\u0000-\u001f]/.test(raw)) return null;
  const parts = raw.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return null;
  const path = parts.join('/');
  if (parts[0] !== 'web' || parts.length < 2 || !/\.html?$/i.test(parts.at(-1))) return null;
  return path;
}
export function normalizeSlideInteraction(data) {
  const value = data?.interaction;
  if (value && typeof value === 'object') {
    const text = typeof value.text === 'string' ? value.text : '';
    const base = value.type === 'open-url' || value.type === 'local-web'
      ? {type:value.type, url:String(value.url ?? '')}
      : {type:'none',url:''};
    // Preserve legacy {type,url} shape when no attached text exists.
    return text ? {...base, text} : base;
  }
  const old = data?.action;
  return typeof old === 'string' && old.trim() ? {type:'open-url',url:old.trim()} : {type:'none',url:''};
}
