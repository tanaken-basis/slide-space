/**
 * Pure slide order mutations for selected slides.
 * The caller owns selection, undo/redo history, and UI refresh.
 * These operations swap existing array entries in place and return whether changed.
 */
export const moveSlideTargetsOneStepLeft = function (slideStates, targetIds) {
  let changed = false;

  for (let i = 1; i < slideStates.length; i++) {
    const current = slideStates[i];
    const previous = slideStates[i - 1];

    const currentSelected = targetIds.has(current.id);

    const previousSelected = targetIds.has(previous.id);

    if (currentSelected && !previousSelected) {
      slideStates[i - 1] = current;
      slideStates[i] = previous;
      changed = true;
    }
  }

  return changed;
};

export const moveSlideTargetsOneStepRight = function (slideStates, targetIds) {
  let changed = false;

  for (let i = slideStates.length - 2; i >= 0; i--) {
    const current = slideStates[i];

    const next = slideStates[i + 1];

    const currentSelected = targetIds.has(current.id);

    const nextSelected = targetIds.has(next.id);

    if (currentSelected && !nextSelected) {
      slideStates[i] = next;

      slideStates[i + 1] = current;

      changed = true;
    }
  }

  return changed;
};


/**
 * Return a reordered copy, keeping selected and unselected slides in
 * their original relative order. History/UI remain the caller's responsibility.
 */
export const moveSelectedSlidesToBoundary = function (slideStates, selectedIds, boundary) {
  if (boundary !== "start" && boundary !== "end") {
    throw new Error(`Invalid slide boundary: ${boundary}`);
  }
  const selected = slideStates.filter((slide) => selectedIds.has(slide.id));
  const unselected = slideStates.filter((slide) => !selectedIds.has(slide.id));
  return boundary === "start"
    ? [...selected, ...unselected]
    : [...unselected, ...selected];
};

/**
 * Group selected slides at a reference position in the ORIGINAL order.
 * The selected slides retain their original ordering.
 */
export const gatherSelectedSlidesAroundIndex = function (slideStates, selectedIds, referenceIndex) {
  if (referenceIndex < 0 || referenceIndex >= slideStates.length) {
    return [...slideStates];
  }
  const selectedSlides = slideStates.filter((slide) => selectedIds.has(slide.id));
  const selectedBeforeReference = slideStates
    .slice(0, referenceIndex)
    .filter((slide) => selectedIds.has(slide.id)).length;
  const remainingSlides = slideStates.filter((slide) => !selectedIds.has(slide.id));
  const insertIndex = Math.max(
    0,
    Math.min(referenceIndex - selectedBeforeReference, remainingSlides.length),
  );
  return [
    ...remainingSlides.slice(0, insertIndex),
    ...selectedSlides,
    ...remainingSlides.slice(insertIndex),
  ];
};
