import {t,getLanguage} from './i18n.js';
export function formatInspectorContext({currentSlide, currentSlideIndex, selectedEntries, total}) {
  const ja = getLanguage() === 'ja';
  const current = currentSlide ? `${currentSlideIndex+1} / ${total} · ${currentSlide.label || t(`Slide ${currentSlideIndex+1}`)}` : ja ? `なし / 全${total}枚` : `None / ${total} slides`;
  const count = selectedEntries.length;
  const target = count ? (ja ? `選択した${count}枚` : `${count} selected ${count===1?'slide':'slides'}`) : currentSlide ? (ja ? '表示中のスライド' : 'current slide') : ja ? 'なし' : 'None';
  return {
    current: `${t('Current Slide')}: ${current}`,
    selection: ja ? `選択: ${count}枚 · 操作対象: ${target}` : `Selection: ${count} · Target: ${target}`,
    summary: ja ? `表示中: ${current}。選択: ${count}枚。編集・複製・削除の対象: ${target}。` : `Current: ${current}. Selected: ${count}. Edit, duplicate and delete target: ${target}.`,
  };
}
