// Step 12L-5F: Pure slide deletion data helpers.
// Resource ownership, URL revocation and history remain with main.js.

export const getSlideIds = (slides) =>
  new Set(slides.map((slideState) => slideState.id));

export const getActiveSlideImageUrls = (slides) =>
  new Set(slides.map((slideState) => slideState.activeImageUrl).filter(Boolean));

export const removeSlidesByIds = (slides, deletedIds) =>
  slides.filter((slideState) => !deletedIds.has(slideState.id));

export const clearSlideRuntimeImageReferences = (slides) => {
  for (const slideState of slides) {
    slideState.imageUrl = null;
    slideState.activeImageUrl = null;
  }
};
