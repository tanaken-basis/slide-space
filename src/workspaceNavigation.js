// Scene-4H: one inspector navigation path for Canvas selection and panel links.
// The scroll container, not the browser viewport, owns inspector scrolling.
export function createInspectorNavigator({ document, requestFrame }) {
  const schedule = typeof requestFrame === 'function' ? requestFrame : (callback) => queueMicrotask(callback);
  let revision = 0;
  const panelContent = document.querySelector('.editor-slide-panel-content');
  const reveal = (element) => {
    if (!element) return false;
    // Nested disclosures must be opened from outside in before measuring.
    const disclosures = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (node.tagName?.toLowerCase() === 'details') disclosures.unshift(node);
      if (node === panelContent) break;
    }
    for (const details of disclosures) details.open = true;
    if (panelContent && typeof element.getBoundingClientRect === 'function'
      && typeof panelContent.getBoundingClientRect === 'function') {
      const container = panelContent.getBoundingClientRect();
      const target = element.getBoundingClientRect();
      const offset = target.top - container.top;
      if (Number.isFinite(offset)) {
        panelContent.scrollTop = Math.max(0, panelContent.scrollTop + offset - 12);
        return true;
      }
    }
    element.scrollIntoView?.({ block: 'start', inline: 'nearest', behavior: 'auto' });
    return true;
  };
  return {
    cancel() { revision++; },
    navigate(element) {
      const request = ++revision;
      if (!element) return false;
      // Wait for the target workspace's display and card layout to settle.
      schedule(() => {
        if (request !== revision) return;
        reveal(element);
      });
      return true;
    },
  };
}
