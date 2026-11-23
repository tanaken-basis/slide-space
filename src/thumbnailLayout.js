export const THUMBNAIL_LAYOUT_KEY = 'slidespace-thumbnail-layout-v1';
export function normalizeThumbnailLayout(value = {}) {
  const height = Number(value?.height);
  return {height: Number.isFinite(height) ? Math.max(90, Math.min(300, Math.round(height / 10) * 10)) : 120, collapsed: value?.collapsed === true};
}
export function initThumbnailLayout(doc = document, storage) {
  const strip = doc.getElementById('thumbnailStrip');
  if (!strip) return;
  const timeline = doc.getElementById('slideTimeline');
  const slider = doc.getElementById('thumbnailHeight');
  const toggle = doc.getElementById('thumbnailCollapse');
  const resizer = doc.getElementById('thumbnailResizer');
  let state = normalizeThumbnailLayout();
  try {storage ??= globalThis.localStorage; state = normalizeThumbnailLayout(JSON.parse(storage?.getItem(THUMBNAIL_LAYOUT_KEY) || '{}'));} catch {}
  const apply = (persist = true) => {
    timeline.style.setProperty('--thumbnail-height', `${state.height}px`);
    timeline.classList.toggle('thumbnails-collapsed', state.collapsed);
    strip.hidden = state.collapsed;
    slider.value = String(state.height);
    toggle.setAttribute('aria-expanded', String(!state.collapsed));
    resizer.setAttribute('aria-valuenow', String(state.height));
    if (persist) {try {storage?.setItem(THUMBNAIL_LAYOUT_KEY, JSON.stringify(state));} catch {}}
  };
  const setHeight = height => {state = normalizeThumbnailLayout({...state, height});apply();};
  slider.addEventListener('input', () => setHeight(Number(slider.value)));
  toggle.addEventListener('click', () => {state.collapsed = !state.collapsed;apply();});
  resizer.addEventListener('keydown', event => {
    const changes = {ArrowUp: 10, ArrowDown: -10};
    if (event.key in changes || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();event.stopPropagation();
      setHeight(event.key === 'Home' ? 90 : event.key === 'End' ? 300 : state.height + changes[event.key]);
    }
  });
  let drag = null;
  resizer.addEventListener('pointerdown', event => {
    if (event.button !== 0 || state.collapsed) return;
    event.preventDefault();
    drag = {y: event.clientY, height: state.height, id: event.pointerId};
    resizer.setPointerCapture(event.pointerId);
  });
  resizer.addEventListener('pointermove', event => {
    if (drag && drag.id === event.pointerId) setHeight(drag.height + drag.y - event.clientY);
  });
  const end = () => {drag = null;};
  resizer.addEventListener('pointerup', end);
  resizer.addEventListener('pointercancel', end);
  resizer.addEventListener('lostpointercapture', end);
  apply(false);
}
