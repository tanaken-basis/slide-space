import { UI_MESSAGES } from './i18nCatalog.js';
export const LANGUAGE_STORAGE_KEY = 'slidespace-language-v1';
const listeners = new Set();
let language = 'ja';
try {language = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ja';} catch {}
const reverse = new Map();
for (const [key, messages] of Object.entries(UI_MESSAGES)) {
  reverse.set(messages.ja, key);reverse.set(messages.en, key);
}
export const getLanguage = () => language;
export const onLanguageChange = listener => {listeners.add(listener);return () => listeners.delete(listener);};
export function setLanguage(value) {
  language = value === 'en' ? 'en' : 'ja';
  let saved = true;
  try {globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY,language);} catch {saved = false;}
  for (const listener of listeners) listener(language);
  return saved;
}
const normal = value => String(value ?? '').replace(/\s+/g,' ').trim();
export function translateUiText(value, locale = language) {
  const text = normal(value);
  const key = UI_MESSAGES[text] ? text : reverse.get(text);
  if (key) return UI_MESSAGES[key][locale];
  const ja = locale === 'ja';
  let match;
  if ((match = /^(?:Undo|元に戻す) \((\d+)\)$/.exec(text))) return `${ja?'元に戻す':'Undo'} (${match[1]})`;
  if ((match = /^(?:Redo|やり直す) \((\d+)\)$/.exec(text))) return `${ja?'やり直す':'Redo'} (${match[1]})`;
  if ((match = /^(\d+) (?:slides?|スライド)$/.exec(text))) return `${match[1]} ${ja?'スライド':Number(match[1])===1?'slide':'slides'}`;
  if ((match = /^(?:Slide|スライド) (\d+)$/.exec(text))) return `${ja?'スライド':'Slide'} ${match[1]}`;
  if ((match = /^(?:Current Slide|表示中のスライド): (.*)$/.exec(text))) return `${ja?'表示中のスライド':'Current Slide'}: ${match[1]}`;
  if ((match = /^(?:Current|現在): (.*)$/.exec(text))) return `${ja?'現在':'Current'}: ${match[1]==='none'||match[1]==='None'||match[1]==='なし'?(ja?'なし':'None'):match[1]}`;
  if ((match = /^(?:Selected Slides|選択スライド) \((\d+)\)$/.exec(text))) return `${ja?'選択スライド':'Selected Slides'} (${match[1]})`;
  if ((match = /^(\d+) (?:Selected Slides|Slides Selected|枚の選択スライド)$/.exec(text))) return ja?`${match[1]} 枚の選択スライド`:`${match[1]} Selected Slides`;
  if ((match = /^(?:Selected|選択): (\d+) (?:Slides?|枚)$/.exec(text))) return ja?`選択: ${match[1]} 枚`:`Selected: ${match[1]} Slides`;
  if (/^(?:Selected: None|選択: なし)$/.test(text)) return ja?'選択: なし':'Selected: None';
  if ((match = /^(?:Operations|操作) → (?:Selected|選択): (.*)$/.exec(text))) return `${ja?'操作 → 選択':'Operations → Selected'}: ${match[1]}`;
  if ((match = /^(?:Operations|操作) → (?:Current|現在): (.*)$/.exec(text))) return `${ja?'操作 → 現在':'Operations → Current'}: ${match[1]}`;
  if ((match = /^(?:Operations|操作) → (\d+) (?:Selected Slides|枚の選択スライド)$/.exec(text))) return ja?`操作 → ${match[1]} 枚の選択スライド`:`Operations → ${match[1]} Selected Slides`;
  if (/^(?:Operations → None|操作 → なし)$/.test(text)) return ja?'操作 → なし':'Operations → None';
  if ((match = /^(?:Selected|選択): (.*)$/.exec(text))) return `${ja?'選択':'Selected'}: ${match[1]}`;
  if ((match = /^(?:Scene Preset|シーンプリセット): (.*)$/.exec(text))) return `${ja?'シーンプリセット':'Scene Preset'}: ${match[1]}`;
  if ((match = /^(Inherited|Override|Mixed|継承|上書き|混在) · (.*)$/.exec(text))) {
    const map={Inherited:'継承',Override:'上書き',Mixed:'混在',継承:'Inherited',上書き:'Override',混在:'Mixed'};
    return `${ja?(/^[A-Z]/.test(match[1])?map[match[1]]:match[1]):(/^[A-Z]/.test(match[1])?match[1]:map[match[1]])} · ${match[2]}`;
  }
  if ((match = /^(?:Effective|適用値): (.*)$/.exec(text))) return `${ja?'適用値':'Effective'}: ${match[1].replace(/ \/ (?:Volume|音量) /,ja?' / 音量 ':' / Volume ').replace(/ \/ (?:Loop|ループ)$/,ja?' / ループ':' / Loop').replace(/ \/ (?:Once|1回)$/,ja?' / 1回':' / Once')}`;
  if ((match = /^(\d+) (?:set\(s\)|セット)$/.exec(text))) return `${match[1]} ${ja?'セット':'set(s)'}`;
  if ((match = /^(\d+) matches \/ (\d+)$/.exec(text))) return ja?`${match[1]}件一致 / ${match[2]}`:text;
  if ((match = /^(.*) を適用しました$/.exec(text))) return ja?text:`Applied ${match[1]}`;
  if ((match = /^Applied (.*)$/.exec(text))) return ja?`${match[1]} を適用しました`:text;
  if ((match = /^読み込み完了（一部初期化失敗: (.*)）$/.exec(text))) return ja?text:`Loaded (some initialization failed: ${match[1]})`;
  if ((match = /^Slide (.*) の画像が見つかりません。$/.exec(text))) return ja?`スライド ${match[1]} の画像が見つかりません。`:`Image not found for slide ${match[1]}.`;
  if ((match = /^Pitch\/Yaw\/Roll display Euler values\..*?along the (World|Local) Gizmo axis;/.exec(text))) return ja?`ピッチ・ヨー・ロールはオイラー角の表示値です。設定値との差分とΔは${match[1]==='World'?'ワールド':'ローカル'}のギズモ軸で回転します。複合回転では表示角度が変わる場合があります。`:text;
  if ((match = /^ピッチ・ヨー・ロールはオイラー角の表示値です。設定値との差分とΔは(ワールド|ローカル)のギズモ軸で回転します。複合回転では表示角度が変わる場合があります。$/.exec(text))) return ja?text:`Pitch/Yaw/Roll display Euler values. Target differences and Δ rotate about ${match[1]==='ワールド'?'World':'Local'} gizmo axes; compound rotations may display different angles.`;
  if ((match = /^(.*) を削除します。 (\d+) slide\(s\) が使用しています。 それらは default に変更されます。$/.exec(text))) return ja ? value : `Delete ${match[1]}?\n${match[2]} slide(s) use this preset. They will be reassigned to default.`;
  if ((match = /^描画色 (.*)$/.exec(text))) return ja?text:`Drawing color ${match[1]}`;
  if ((match = /^線の太さ (.*)$/.exec(text))) return ja?text:`Stroke width ${match[1]}`;
  return text;
}
export const t = translateUiText;

// Translate only authored UI nodes and explicitly owned status fields.
// Project/slide/preset/asset names, table data, input values and saved JSON are excluded.
export function initI18n(document, window) {
  const liveIds = ['projectLoadStatus','workspacePreferenceStatus','workspaceSoundStatus','appNoticeMessage','slideInspectorTitle','multiCurrentSlideInfo','toolbarCurrentSlideStatus','slideSelectionStatus','multiSlideInspectorSelectionCount','slideOperationTargetHint','slideSettingsTargetLabel','slideTransformTargetLabel','projectPanelEditingPreset','environmentOverrideStatus','skyboxEditorStatus','multiFogColorMixedLabel','slideBgmEffectiveValue','scenePresetBgmEffective','slideAutoPlayEffectiveValue','projectBgmStatus','presentationBgmMessage','presentationLoopStatus','presentationOverviewStatus','slideRotationSpaceHint'];
  const liveClasses = '.multi-field-state, .slide-thumbnail-no-image, .presentation-overview-current-marker, .presentation-overview-empty, .slide-thumbnail-empty';
  for (const id of liveIds) document.getElementById(id)?.setAttribute('data-i18n-live','');
  const states = new WeakMap();
  const fields = ['title','aria-label','placeholder','label'];
  function render(element, field = null) {
    const attribute = field ? `data-i18n-${field}` : element.hasAttribute('data-i18n-live') ? 'data-i18n-live' : 'data-i18n';
    if (!element.hasAttribute(attribute)) return;
    const current = normal(field ? element.getAttribute(field) : element.textContent);
    const entries = states.get(element) ?? new Map();
    const previous = entries.get(field);
    let source = previous?.source ?? (element.getAttribute(attribute) || current);
    if (previous && current !== previous.output) source = current;
    const output = translateUiText(source);
    const rendered = !field && element.hasAttribute('data-i18n-space') ? output + ' ' : output;
    if (current !== output || (!field && element.hasAttribute('data-i18n-space') && !element.textContent.endsWith(' '))) {
      if (field) element.setAttribute(field,output);
      else element.textContent = rendered;
    }
    entries.set(field,{source,output});states.set(element,entries);
  }
  function prepare(element) {
    if (element.matches?.(liveClasses)) element.setAttribute('data-i18n-live','');
    if (element.tagName === 'OPTION' && ['', '__mixed__', 'mixed'].includes(element.value) && UI_MESSAGES[element.textContent.trim()]) element.setAttribute('data-i18n-live','');
    for (const field of fields) {
      const value = element.getAttribute?.(field);
      if (value && (UI_MESSAGES[value] || reverse.has(value) || /^(描画色 |線の太さ |Drawing color |Stroke width )/.test(value)) && !element.hasAttribute(`data-i18n-${field}`)) element.setAttribute(`data-i18n-${field}`,value);
    }
    if (element.hasAttribute('data-i18n') || element.hasAttribute('data-i18n-live')) render(element);
    for (const field of fields) render(element,field);
  }
  function scan(root) {
    if (root.nodeType === 1) prepare(root);
    for (const element of root.querySelectorAll?.('[data-i18n], [data-i18n-live], [data-i18n-title], [data-i18n-aria-label], [data-i18n-placeholder], [data-i18n-label], input, select, button, option, '+liveClasses) ?? []) prepare(element);
  }
  const select = document.getElementById('workspaceLanguage');
  const refresh = () => {
    document.documentElement.lang = language;
    if (select) select.value = language;
    const thumbnails = document.getElementById('thumbnailContainer');
    if (thumbnails) thumbnails.dataset.emptyLabel = t('まだスライドがありません。Projectから開くか、Slidesで現在の状態を記録してください。');
    scan(document);
  };
  select?.addEventListener('change', () => {
    if (!setLanguage(select.value)) {
      const status = document.getElementById('workspacePreferenceStatus');
      if (status) status.textContent = t('このブラウザーでは設定を保存できません。今回の表示には反映されます。');
    }
  });
  refresh();
  const stop = onLanguageChange(refresh);
  const observer = new window.MutationObserver(records => {
    for (const record of records) {
      const target = record.target.nodeType === 3 ? record.target.parentElement : record.target;
      if (!target || target.nodeType !== 1) continue;
      const owner = target.closest('[data-i18n], [data-i18n-live]');
      if (owner) render(owner);
      if (record.type === 'attributes') prepare(target);
      for (const node of record.addedNodes ?? []) if (node.nodeType === 1) scan(node);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:fields});
  return () => {stop();observer.disconnect();};
}
