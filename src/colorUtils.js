// Independent helpers; existing conversion behavior is preserved.

export const colorArrayToHex = function (color) {
  if (!Array.isArray(color) || color.length < 3) {
    return "#ffffff";
  }

  const toHex = (value) => {
    const v = Math.round(Math.max(0, Math.min(1, Number(value))) * 255);

    return v.toString(16).padStart(2, "0");
  };

  return "#" + toHex(color[0]) + toHex(color[1]) + toHex(color[2]);
};

export const hexToColorArray = function (hex) {
  const normalized = String(hex).replace("#", "").trim();

  if (normalized.length !== 6) {
    return null;
  }

  const r = parseInt(normalized.slice(0, 2), 16);

  const g = parseInt(normalized.slice(2, 4), 16);

  const b = parseInt(normalized.slice(4, 6), 16);

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return null;
  }

  return [r / 255, g / 255, b / 255];
};
