import {initThumbnailLayout} from './thumbnailLayout.js';
import {initI18n} from './i18n.js';
import { setWorkspacePanelExpanded } from './sectionDisclosure.js';
import { uiSound } from './uiSound.js';
import { createWorkspacePreferences, normalizeCategory } from './workspacePreferences.js';
import { createInspectorNavigator } from './workspaceNavigation.js';

const status = document.getElementById('workspacePreferenceStatus');
const preferences = createWorkspacePreferences({
  storage: () => window.localStorage,
  root: document.documentElement,
  media: window.matchMedia('(prefers-color-scheme: dark)'),
  status: (message) => { if (status) status.textContent = message; },
});
const theme = document.getElementById('workspaceTheme');
theme.value = preferences.getTheme();
theme.addEventListener('change', () => preferences.setTheme(theme.value));
const tabs = [...document.querySelectorAll('[data-workspace-tab]')];
const panels = [...document.querySelectorAll('[data-workspace-panel]')];
const panelContent = document.querySelector('.editor-slide-panel-content');
const positions = new Map();
const inspectorNavigation = createInspectorNavigator({
  document,
  requestFrame: callback => requestAnimationFrame(callback),
});
let active = 'slides';
function activateCategory(value, { persist = true, reveal = true, focus = false } = {}) {
  inspectorNavigation.cancel();
  const key = normalizeCategory(value);
  positions.set(active, panelContent.scrollTop);
  for (const tab of tabs) {
    const selected = tab.dataset.workspaceTab === key;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of panels) panel.hidden = panel.dataset.workspacePanel !== key;
  active = key;
  panelContent.scrollTop = positions.get(key) || 0;
  if (persist) preferences.setCategory(key);
  // Let the existing layout controller own collapsed state and persistence.
  if (reveal && document.querySelector('.editor-main').classList.contains('slide-panel-collapsed')) {
    document.getElementById('slidePanelCollapseButton').click();
  }
  if (focus) document.querySelector(`[data-workspace-tab="${key}"]`).focus();
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => activateCategory(tab.dataset.workspaceTab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    // Avoid editor camera shortcuts when navigating categories.
    event.preventDefault();
    event.stopPropagation();
    activateCategory(tabs[next].dataset.workspaceTab, { focus: true });
  });
}
// Scene-1Z: all entry points focus the actual Gizmo controls, not the
// beginning of the Transform workspace. The workspace controls their scroll.
// Scene-2Z: all selection entry points reveal the shared Selection Gizmo,
// irrespective of whether the last picked object was a Slide or an Asset.
function revealTransformGizmo(kind) {
  const target = document.getElementById('scene2uSelectionGizmo');
  if (!target) return;
  inspectorNavigation.navigate(target);
}

document.addEventListener('slidespace:reveal-transform', event => {
  activateCategory('transform');
  revealTransformGizmo(event.detail?.kind);
});

for (const link of document.querySelectorAll('[data-workspace-link]')) {
  link.addEventListener('click', () => {
    activateCategory(link.dataset.workspaceLink);
    // Links inside a panel are about to become hidden. Move focus to the new heading.
    const target = document.querySelector(`[data-workspace-panel="${active}"] h1`);
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    if (link.dataset.workspaceScrollTo) {
      const destination = document.getElementById(link.dataset.workspaceScrollTo);
      if (destination) {
        // Expand a collapsed appearance card before navigating to it.
        // This also works for any future header shortcut into a details card.
        if (destination.matches('details') && !destination.open) destination.open = true;
        inspectorNavigation.navigate(destination);
      } else inspectorNavigation.navigate(target);
    } else if (link.dataset.transformTarget) {
      revealTransformGizmo(link.dataset.transformTarget);
    } else {
      inspectorNavigation.navigate(target);
    }
  });
}
// Palette and width swatches retain their existing click handlers and gain keyboard access.
for (const swatch of document.querySelectorAll('.color-option, .line-width-option')) {
  swatch.tabIndex = 0;
  swatch.setAttribute('role', 'button');
  const color = swatch.dataset.color;
  swatch.setAttribute('aria-label', color ? `描画色 ${color}` : `線の太さ ${swatch.dataset.width}`);
  swatch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); event.stopPropagation(); swatch.click();
  });
}
activateCategory(preferences.getCategory(), { persist: false, reveal: false });

for (const [id, expanded] of [['toolbarExpandCards',true],['toolbarCollapseCards',false]]) {
  document.getElementById(id)?.addEventListener('click', () => {
    setWorkspacePanelExpanded(document.querySelector(`[data-workspace-panel=\"${active}\"]`), expanded);
    void uiSound.play();
  });
}
for (const button of document.querySelectorAll('[data-expand-panel], [data-collapse-panel]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.expandPanel ?? button.dataset.collapsePanel;
    setWorkspacePanelExpanded(document.getElementById(`workspace-${key}`), button.dataset.expandPanel !== undefined);
  });
}
const soundToggle = document.getElementById('workspaceUiSound');
const soundPreview = document.getElementById('workspaceSoundPreview');
if (soundToggle && soundPreview) {
  soundToggle.checked = uiSound.isEnabled();

  soundToggle.addEventListener('change', () => {
    uiSound.setEnabled(soundToggle.checked);
  });
  soundPreview.addEventListener('click', () => {void uiSound.play({preview: true});});
}
// A short optional cue for settings; explicit preview controls do not change preferences.
document.addEventListener('click', event => {
  if (document.querySelector('.editor-app')?.classList.contains('presentation-mode')) return;
  if (event.target.closest('#workspaceSoundPreview, #workspaceSliderPreview')) return;
  const button = event.target.closest('button, summary, [role="button"]');
  if (button && button.closest('.editor-panel, .editor-toolbar')) void uiSound.play();
});
document.addEventListener('change', event => {
  if (document.querySelector('.editor-app')?.classList.contains('presentation-mode')) return;
  if (event.target.id === 'workspaceSliderPreview') return;
  if (event.target.closest('.editor-panel')) void uiSound.play();
});

const sliderSoundToggle = document.getElementById('workspaceSliderSound');
if (sliderSoundToggle) {
  sliderSoundToggle.checked = uiSound.isSliderEnabled();
  sliderSoundToggle.addEventListener('change', () => uiSound.setSliderEnabled(sliderSoundToggle.checked));
}
document.addEventListener('input', event => {
  const slider = event.target;
  if (!slider.matches('input[type="range"]') || slider.disabled || !slider.closest('.editor-panel')) return;
  if (document.querySelector('.editor-app')?.classList.contains('presentation-mode')) return;
  const min = Number(slider.min || 0), max = Number(slider.max || 100);
  const value = max > min ? (Number(slider.value) - min) / (max - min) : .5;
  void uiSound.play({kind: 'slider', value, preview: slider.id === 'workspaceSliderPreview'});
});

initThumbnailLayout(document);
initI18n(document, window);
