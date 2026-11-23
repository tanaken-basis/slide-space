import {t} from './i18n.js';
// Owns notice visibility, duplicate suppression, and its timer.
// Creation does not display a notice or register events.
export const createAppNotice = function ({ appNotice, appNoticeMessage }) {
  const APP_NOTICE_DUPLICATE_WINDOW = 1500;

  let appNoticeTimer = null;

  let lastAppNoticeKey = "";

  let lastAppNoticeTime = 0;

  const hideAppNotice = function () {
    if (appNoticeTimer !== null) {
      clearTimeout(appNoticeTimer);

      appNoticeTimer = null;
    }

    if (appNotice) {
      appNotice.hidden = true;
    }
  };

  const showAppNotice = function (
    message,
    { level = "warning", duration = 5000, key = "" } = {},
  ) {
    const now = performance.now();

    const noticeKey = key || String(message);

    if (
      noticeKey === lastAppNoticeKey &&
      now - lastAppNoticeTime < APP_NOTICE_DUPLICATE_WINDOW
    ) {
      return;
    }

    lastAppNoticeKey = noticeKey;

    lastAppNoticeTime = now;

    if (!appNotice || !appNoticeMessage) {
      console.warn("App Notice UI is not available:", message);

      return;
    }

    hideAppNotice();

    appNotice.dataset.level = level;

    appNoticeMessage.textContent = t(message ?? "");

    appNotice.hidden = false;

    if (Number.isFinite(duration) && duration > 0) {
      appNoticeTimer = window.setTimeout(hideAppNotice, duration);
    }
  };

  return { hideAppNotice, showAppNotice };
};
