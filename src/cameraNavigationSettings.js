/** Camera navigation preferences belong to the local browser, not project.json. */
export const CAMERA_NAVIGATION_STORAGE_KEY = 'slidespace.cameraNavigation.v2';
export const DEFAULT_CAMERA_NAVIGATION_SETTINGS = Object.freeze({
  rotateSensitivity: 1,
  keyboardRotateSensitivity: 1,
  panSensitivity: 1,
  dollySensitivity: 1,
  wheelSensitivity: 1,
  invertY: false,
  invertX: false,
  invertDolly: false,
  invertWheel: false,
  rotationMode: 'look',
  middleButtonAction: 'dolly',
  rightButtonAction: 'pan',
});
const finiteRange = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(5, Math.max(0.1, n)) : fallback;
};
export function normalizeCameraNavigationSettings(value = {}) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const defaults = DEFAULT_CAMERA_NAVIGATION_SETTINGS;
  const swapped = (raw.middleButtonAction == null && raw.rightButtonAction == null) || (raw.middleButtonAction === 'dolly' && raw.rightButtonAction === 'pan');
  return {
    rotateSensitivity: finiteRange(raw.rotateSensitivity, defaults.rotateSensitivity),
    keyboardRotateSensitivity: finiteRange(raw.keyboardRotateSensitivity, defaults.keyboardRotateSensitivity),
    panSensitivity: finiteRange(raw.panSensitivity, defaults.panSensitivity),
    dollySensitivity: finiteRange(raw.dollySensitivity, defaults.dollySensitivity),
    wheelSensitivity: finiteRange(raw.wheelSensitivity, defaults.wheelSensitivity),
    invertY: raw.invertY === true,
    invertX: raw.invertX === true,
    invertDolly: raw.invertDolly === true,
    invertWheel: raw.invertWheel === true,
    rotationMode: raw.rotationMode === 'orbit' ? 'orbit' : 'look',
    middleButtonAction: swapped ? 'dolly' : 'pan',
    rightButtonAction: swapped ? 'pan' : 'dolly',
  };
}
export function loadCameraNavigationSettings(storage = globalThis.localStorage) {
  try { return normalizeCameraNavigationSettings(JSON.parse(storage?.getItem(CAMERA_NAVIGATION_STORAGE_KEY) || '{}')); }
  catch { return normalizeCameraNavigationSettings(); }
}
export function saveCameraNavigationSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeCameraNavigationSettings(settings);
  try { storage?.setItem(CAMERA_NAVIGATION_STORAGE_KEY, JSON.stringify(normalized)); }
  catch { /* Storage may be unavailable in private/sandbox contexts. */ }
  return normalized;
}
