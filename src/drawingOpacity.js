// Shared opacity encoding. Existing color values remain readable as CSS colors.
export function strokeColorWithOpacity(color, opacity = 1) {
  const alpha = Math.max(0, Math.min(1, Number(opacity)));
  const text = String(color || "#ff0000").trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex) { const n = Number.parseInt(hex[1], 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`; }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(text);
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`;
  return text;
}
