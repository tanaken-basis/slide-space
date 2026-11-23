// Step 12L: Pure file/path helpers. No DOM, Babylon, or application state dependencies.

export const extractFilenameFromPath = function (path) {
  if (!path) {
    return "";
  }

  const normalized = String(path).replaceAll("\\", "/");

  return normalized.split("/").pop() ?? "";
};

export const normalizeProjectRelativePath = function (path) {
  if (typeof path !== "string") {
    return "";
  }

  return path
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
};

export const createSlideImagePathFromId = function (imageId) {
  return `slides/slide(${imageId}).png`;
};

export const extractImageIdFromSlideImagePath = function (imagePath) {
  const filename = extractFilenameFromPath(imagePath);

  const match = filename.match(/^slide\((\d+)\)\.png$/i);

  if (!match) {
    return null;
  }

  return Number(match[1]);
};

export const normalizeSlideImagePath = function (path) {
  const normalized = normalizeProjectRelativePath(path);

  if (!normalized) {
    return "";
  }

  // slide(3).png のような
  // filenameだけだった旧形式にも対応
  if (!normalized.includes("/")) {
    return `slides/${normalized}`;
  }

  return normalized;
};
