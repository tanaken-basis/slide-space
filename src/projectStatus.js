import {t,onLanguageChange} from './i18n.js';
// Compare the data that is actually saved, rather than counting UI events/history entries.
export const projectSignature = value => JSON.stringify(value, (_, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
    : item,
);
export function createProjectStatus({readData, stateElement, countElement, noticeElement, schedule = setTimeout, cancel = clearTimeout}) {
  let baseline = null;
  let noticeTimer = null;
  let noticeKey = '';
  function refresh() {
    const data = readData();
    const dirty = baseline !== null && projectSignature(data) !== baseline;
    const label = t(baseline === null ? '未保存' : dirty ? '未保存の変更あり' : '保存済み');
    if (stateElement.textContent !== label) stateElement.textContent = label;
    stateElement.dataset.state = baseline === null ? 'new' : dirty ? 'dirty' : 'saved';
    const count = t(`${data?.slides?.length ?? 0} slides`);
    if (countElement.textContent !== count) countElement.textContent = count;
    if (dirty && noticeKey === '保存しました') {
      if (noticeTimer !== null) cancel(noticeTimer);
      noticeTimer = null;
      noticeKey = '';
      noticeElement.textContent = '';
    } else if (noticeKey && noticeElement.textContent !== t(noticeKey)) noticeElement.textContent = t(noticeKey);
    return {dirty, saved:baseline !== null, count:data?.slides?.length ?? 0};
  }
  function notice(message, duration = 4000) {
    if (noticeTimer !== null) cancel(noticeTimer);
    noticeKey = message;
    noticeElement.textContent = t(message);
    noticeTimer = duration > 0 ? schedule(() => {noticeElement.textContent = '';noticeKey = '';noticeTimer = null;}, duration) : null;
  }
  const stop = onLanguageChange(refresh);
  return {
    refresh, notice,
    markSaved(data = readData()) {baseline = projectSignature(data);return refresh();},
    markNew() {baseline = null;return refresh();},
    dispose() {stop();if (noticeTimer !== null) cancel(noticeTimer);},
  };
}
