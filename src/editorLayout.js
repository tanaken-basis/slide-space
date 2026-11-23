// Owns panel widths, collapsed state, persistence, and panel events.
// DOM references are supplied after the application's DOM cache is ready.
export const createEditorLayout = function ({
  projectPanelResizer,
  slidePanelResizer,
  projectPanelCollapseButton,
  slidePanelCollapseButton,
}) {
  const EDITOR_LAYOUT_STORAGE_KEY = "slides-in-3d-editor-layout-v1";

  let activeEditorPanelResize = null;

  let isProjectPanelCollapsed = false;

  let isSlidePanelCollapsed = false;

  const getEditorCssPixelValue = function (propertyName, fallback) {
    const rootStyle = getComputedStyle(document.documentElement);

    const value = Number.parseFloat(rootStyle.getPropertyValue(propertyName));

    return Number.isFinite(value) ? value : fallback;
  };

  const getEditorPanelConfiguredWidth = function (panel) {
    const propertyName =
      panel === "project" ? "--ui-project-panel-width" : "--ui-slide-panel-width";

    return getEditorCssPixelValue(propertyName, panel === "project" ? 300 : 360);
  };

  const getEditorPanelOccupiedWidth = function (panel) {
    const railWidth = getEditorCssPixelValue("--ui-panel-rail-width", 40);

    if (panel === "project") {
      return isProjectPanelCollapsed
        ? railWidth
        : getEditorPanelConfiguredWidth("project");
    }

    return isSlidePanelCollapsed
      ? railWidth
      : getEditorPanelConfiguredWidth("slide");
  };

  const getEditorPanelDynamicMaxWidth = function (panel) {
    const editorMain = document.querySelector(".editor-main");

    const configuredMaxWidth = getEditorCssPixelValue(
      "--ui-panel-max-width",
      520,
    );

    if (!editorMain || window.matchMedia("(max-width: 1100px)").matches) {
      return configuredMaxWidth;
    }

    const viewportMinWidth = getEditorCssPixelValue(
      "--ui-viewport-min-width",
      320,
    );

    const resizerWidth = getEditorCssPixelValue("--ui-resizer-width", 5);

    const editorWidth = editorMain.getBoundingClientRect().width;

    const otherPanel = panel === "project" ? "slide" : "project";

    const otherPanelWidth = getEditorPanelOccupiedWidth(otherPanel);

    const currentResizerWidth =
      panel === "project"
        ? isProjectPanelCollapsed
          ? 0
          : resizerWidth
        : isSlidePanelCollapsed
          ? 0
          : resizerWidth;

    const otherResizerWidth =
      otherPanel === "project"
        ? isProjectPanelCollapsed
          ? 0
          : resizerWidth
        : isSlidePanelCollapsed
          ? 0
          : resizerWidth;

    const availableWidth =
      editorWidth -
      otherPanelWidth -
      currentResizerWidth -
      otherResizerWidth -
      viewportMinWidth;

    return Math.min(configuredMaxWidth, availableWidth);
  };

  const clampEditorPanelWidth = function (panel, width) {
    const minWidth = getEditorCssPixelValue(
      panel === "project" ? "--ui-project-panel-min-width" : "--ui-panel-min-width",
      panel === "project" ? 180 : 300,
    );

    const configuredMaxWidth = getEditorCssPixelValue(
      "--ui-panel-max-width",
      520,
    );

    const dynamicMaxWidth = getEditorPanelDynamicMaxWidth(panel);

    const maxWidth = Math.max(
      minWidth,
      Math.min(configuredMaxWidth, dynamicMaxWidth),
    );

    return Math.min(Math.max(width, minWidth), maxWidth);
  };

  const setEditorPanelWidth = function (panel, width) {
    const clampedWidth = clampEditorPanelWidth(panel, width);

    const propertyName =
      panel === "project" ? "--ui-project-panel-width" : "--ui-slide-panel-width";

    document.documentElement.style.setProperty(propertyName, `${clampedWidth}px`);

    return clampedWidth;
  };

  const beginEditorPanelResize = function (panel, event) {
    if (event.button !== 0) {
      return;
    }

    if (
      (panel === "project" && isProjectPanelCollapsed) ||
      (panel === "slide" && isSlidePanelCollapsed)
    ) {
      return;
    }

    event.preventDefault();

    activeEditorPanelResize = panel;

    document.body.classList.add("editor-panel-resizing");

    const resizer = panel === "project" ? projectPanelResizer : slidePanelResizer;

    resizer?.classList.add("resizing");
  };

  const updateEditorPanelResize = function (event) {
    if (!activeEditorPanelResize) {
      return;
    }

    const editorMain = document.querySelector(".editor-main");

    if (!editorMain) {
      return;
    }

    const bounds = editorMain.getBoundingClientRect();

    if (activeEditorPanelResize === "project") {
      const width = event.clientX - bounds.left;

      setEditorPanelWidth("project", width);

      return;
    }

    if (activeEditorPanelResize === "slide") {
      const width = bounds.right - event.clientX;

      setEditorPanelWidth("slide", width);
    }
  };

  const finishEditorPanelResize = function () {
    if (!activeEditorPanelResize) {
      return;
    }

    activeEditorPanelResize = null;

    document.body.classList.remove("editor-panel-resizing");

    projectPanelResizer?.classList.remove("resizing");

    slidePanelResizer?.classList.remove("resizing");

    saveEditorLayoutSettings();
  };

  const updateProjectPanelCollapsedState = function () {
    const editorMain = document.querySelector(".editor-main");

    if (!editorMain) {
      return;
    }

    editorMain.classList.toggle(
      "project-panel-collapsed",
      isProjectPanelCollapsed,
    );

    if (projectPanelCollapseButton) {
      projectPanelCollapseButton.textContent = isProjectPanelCollapsed
        ? "▶"
        : "◀";

      projectPanelCollapseButton.title = isProjectPanelCollapsed
        ? "Expand Project Panel"
        : "Collapse Project Panel";

      projectPanelCollapseButton.setAttribute(
        "aria-label",
        projectPanelCollapseButton.title,
      );

      projectPanelCollapseButton.setAttribute(
        "aria-expanded",
        String(!isProjectPanelCollapsed),
      );
    }
  };

  const updateSlidePanelCollapsedState = function () {
    const editorMain = document.querySelector(".editor-main");

    if (!editorMain) {
      return;
    }

    editorMain.classList.toggle("slide-panel-collapsed", isSlidePanelCollapsed);

    if (slidePanelCollapseButton) {
      slidePanelCollapseButton.textContent = isSlidePanelCollapsed ? "◀" : "▶";

      slidePanelCollapseButton.title = isSlidePanelCollapsed
        ? "Expand Slide Panel"
        : "Collapse Slide Panel";

      slidePanelCollapseButton.setAttribute(
        "aria-label",
        slidePanelCollapseButton.title,
      );

      slidePanelCollapseButton.setAttribute(
        "aria-expanded",
        String(!isSlidePanelCollapsed),
      );
    }
  };

  const toggleProjectPanelCollapsed = function () {
    isProjectPanelCollapsed = !isProjectPanelCollapsed;

    updateProjectPanelCollapsedState();

    saveEditorLayoutSettings();
  };

  const toggleSlidePanelCollapsed = function () {
    isSlidePanelCollapsed = !isSlidePanelCollapsed;

    updateSlidePanelCollapsedState();

    saveEditorLayoutSettings();
  };

  const getEditorPanelWidth = function (panel) {
    const width = getEditorPanelConfiguredWidth(panel);

    if (!Number.isFinite(width)) {
      return null;
    }

    return clampEditorPanelWidth(panel, width);
  };

  const normalizeEditorPanelWidths = function () {
    if (!isProjectPanelCollapsed) {
      const projectWidth = getEditorPanelConfiguredWidth("project");

      setEditorPanelWidth("project", projectWidth);
    }

    if (!isSlidePanelCollapsed) {
      const slideWidth = getEditorPanelConfiguredWidth("slide");

      setEditorPanelWidth("slide", slideWidth);
    }
  };

  const saveEditorLayoutSettings = function () {
    try {
      const projectPanelWidth = getEditorPanelWidth("project");

      const slidePanelWidth = getEditorPanelWidth("slide");

      const settings = {
        projectPanelWidth,
        slidePanelWidth,

        projectPanelCollapsed: isProjectPanelCollapsed,

        slidePanelCollapsed: isSlidePanelCollapsed,
      };

      localStorage.setItem(EDITOR_LAYOUT_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save editor layout settings:", error);
    }
  };

  const loadEditorLayoutSettings = function () {
    try {
      const json = localStorage.getItem(EDITOR_LAYOUT_STORAGE_KEY);

      if (!json) {
        return;
      }

      const settings = JSON.parse(json);

      if (Number.isFinite(Number(settings.projectPanelWidth))) {
        setEditorPanelWidth("project", Number(settings.projectPanelWidth));
      }

      if (Number.isFinite(Number(settings.slidePanelWidth))) {
        setEditorPanelWidth("slide", Number(settings.slidePanelWidth));
      }

      if (typeof settings.projectPanelCollapsed === "boolean") {
        isProjectPanelCollapsed = settings.projectPanelCollapsed;
      }

      if (typeof settings.slidePanelCollapsed === "boolean") {
        isSlidePanelCollapsed = settings.slidePanelCollapsed;
      }

      updateProjectPanelCollapsedState();
      updateSlidePanelCollapsedState();
    } catch (error) {
      console.warn("Failed to load editor layout settings:", error);
    }
  };

  let unbindEvents = null;

  const bindEvents = function () {
    if (unbindEvents) {
      return unbindEvents;
    }

    const beginProjectResize = (event) => beginEditorPanelResize("project", event);
    const beginSlideResize = (event) => beginEditorPanelResize("slide", event);

    projectPanelResizer?.addEventListener("pointerdown", beginProjectResize);
    slidePanelResizer?.addEventListener("pointerdown", beginSlideResize);
    window.addEventListener("pointermove", updateEditorPanelResize);
    window.addEventListener("pointerup", finishEditorPanelResize);
    window.addEventListener("pointercancel", finishEditorPanelResize);
    projectPanelCollapseButton?.addEventListener("click", toggleProjectPanelCollapsed);
    slidePanelCollapseButton?.addEventListener("click", toggleSlidePanelCollapsed);

    unbindEvents = function () {
      projectPanelResizer?.removeEventListener("pointerdown", beginProjectResize);
      slidePanelResizer?.removeEventListener("pointerdown", beginSlideResize);
      window.removeEventListener("pointermove", updateEditorPanelResize);
      window.removeEventListener("pointerup", finishEditorPanelResize);
      window.removeEventListener("pointercancel", finishEditorPanelResize);
      projectPanelCollapseButton?.removeEventListener("click", toggleProjectPanelCollapsed);
      slidePanelCollapseButton?.removeEventListener("click", toggleSlidePanelCollapsed);
      finishEditorPanelResize();
      unbindEvents = null;
    };

    return unbindEvents;
  };

  return { bindEvents, loadEditorLayoutSettings, normalizeEditorPanelWidths };
};
