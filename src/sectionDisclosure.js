// Native disclosures and existing custom sections share panel-local expand/collapse.
export function setWorkspacePanelExpanded(panel, expanded) {
  if (!panel) return;
  for (const details of panel.querySelectorAll('details')) details.open = expanded;
  for (const toggle of panel.querySelectorAll('.multi-section-toggle[aria-expanded]')) {
    if ((toggle.getAttribute('aria-expanded') === 'true') !== expanded) toggle.click();
  }
}
