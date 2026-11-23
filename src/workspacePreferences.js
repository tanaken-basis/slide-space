import {t} from './i18n.js';
import { THEME_CATALOG } from './themes.js';
// UI preferences belong to this browser, never to project data or editor history.
export const THEME_STORAGE_KEY = 'slidespace-theme-v1';
export const CATEGORY_STORAGE_KEY = 'slidespace-category-v1';
export const THEMES = Object.freeze(['system', ...THEME_CATALOG.map(theme => theme.id)]);
export const CATEGORIES = Object.freeze(['slides', 'transform', 'camera', 'scene', 'presentation', 'drawing', 'project']);
export function normalizeTheme(value) { return THEMES.includes(value) ? value : 'system'; }
export function normalizeCategory(value) { return CATEGORIES.includes(value) ? value : 'slides'; }
export function resolveTheme(preference, dark) { return normalizeTheme(preference) === 'system' ? (dark ? 'dark' : 'light') : preference; }
export function createWorkspacePreferences({ storage, root, media, status = () => {} }) {
  let theme = 'system';
  const read = (key) => {
    try { return storage()?.getItem(key); } catch { return null; }
  };
  const write = (key, value) => {
    try {
      const target = storage();
      if (!target) throw new Error('Storage unavailable');
      target.setItem(key, value);
      status(t('外観とカテゴリはこの端末に保存されます。'));
      return true;
    } catch {
      status(t('このブラウザーでは設定を保存できません。今回の表示には反映されます。'));
      return false;
    }
  };
  const apply = () => { root.dataset.theme = resolveTheme(theme, media.matches); };
  theme = normalizeTheme(read(THEME_STORAGE_KEY));
  apply();
  media.addEventListener('change', apply);
  return {
    getTheme: () => theme,
    setTheme(value) { theme = normalizeTheme(value); apply(); return write(THEME_STORAGE_KEY, theme); },
    getCategory: () => normalizeCategory(read(CATEGORY_STORAGE_KEY)),
    setCategory: (value) => write(CATEGORY_STORAGE_KEY, normalizeCategory(value)),
    dispose: () => media.removeEventListener('change', apply),
  };
}
