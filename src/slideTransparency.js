/** Whether the slide plane is rendered. An absent image is not a transparency flag. */
export const isSlidePlaneVisible = (slide, presentation) =>
  !(presentation && slide?.transparentInPresentation === true);
