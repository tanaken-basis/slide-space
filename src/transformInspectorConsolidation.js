/** Scene-3B — progressive UI consolidation, without changing Gizmo handlers.
 * Existing per-type controls stay mounted, with their IDs/listeners intact.
 * Only duplicated Gizmo settings are moved into initially collapsed disclosures.
 */
export function organizeLegacyTransformPanels({ document, translate, onLanguageChange, onNavigate }) {
  const definitions = [
    { selector: '.ui1f-slide-gizmo-inline', title: 'Additional Slide Gizmo and camera controls' },
    { selector: '.asset-gizmo-controls.ui1d-asset-gizmo', title: 'Additional Asset Gizmo controls' },
  ];
  const labels = [];
  for (const { selector, title } of definitions) {
    const legacy = document.querySelector(selector);
    if (!legacy || legacy.closest('.scene3b-legacy-disclosure')) continue;
    const disclosure = document.createElement('details');
    disclosure.className = 'scene3b-legacy-disclosure';
    const summary = document.createElement('summary');
    summary.dataset.i18n = title;
    labels.push({ node: summary, key: title });
    disclosure.append(summary);
    // Preserve the original node (and all listeners bound to it / its descendants).
    legacy.parentNode.insertBefore(disclosure, legacy);
    disclosure.append(legacy);
    const toolbar = document.createElement('div');
    toolbar.className = 'scene3b-legacy-shortcut';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'small-button';
    action.dataset.i18n = 'Go to Selection Gizmo';
    labels.push({ node: action, key: 'Go to Selection Gizmo' });
    action.addEventListener('click', onNavigate);
    toolbar.append(action);
    disclosure.parentNode.insertBefore(toolbar, disclosure);
  }
  const refresh = () => {
    for (const { node, key } of labels) node.textContent = translate(key);
  };
  refresh();
  if (labels.length && onLanguageChange) onLanguageChange(refresh);
  return labels.length / 2;
}
