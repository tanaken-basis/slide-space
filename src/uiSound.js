export const UI_SOUND_STORAGE_KEY = 'slidespace-ui-sound-v1';
export const SLIDER_SOUND_STORAGE_KEY = 'slidespace-slider-sound-v1';
export function createUiSound({storage, createContext, onError = () => {}}) {
  let enabled = false;
  let sliderEnabled = false;
  let context = null;
  const lastPlayed = {operation: -Infinity, slider: -Infinity};
  try {enabled = storage()?.getItem(UI_SOUND_STORAGE_KEY) === 'true';} catch {}
  try {sliderEnabled = storage()?.getItem(SLIDER_SOUND_STORAGE_KEY) === 'true';} catch {}
  const persist = () => {try {storage()?.setItem(UI_SOUND_STORAGE_KEY,String(enabled));} catch {onError('操作音の設定を保存できません。今回の操作には反映されます。');}};
  return {
    isEnabled: () => enabled,
    setEnabled(value) {enabled = value === true;persist();},
    isSliderEnabled: () => sliderEnabled,
    setSliderEnabled(value) {
      sliderEnabled = value === true;
      try {storage()?.setItem(SLIDER_SOUND_STORAGE_KEY, String(sliderEnabled));}
      catch {onError('操作音の設定を保存できません。今回の操作には反映されます。');}
    },
    async play({kind = 'operation', value = .5, preview = false} = {}) {
      const active = () => preview || (kind === 'slider' ? sliderEnabled : enabled);
      if (!active()) return false;
      try {
        context ??= createContext();
        if (!context) return false;
        if (context.state === 'suspended') await context.resume();
        if (!active()) return false;
        const now = context.currentTime;
        if (now-lastPlayed[kind] < (kind === 'slider' ? .08 : .035)) return false;
        lastPlayed[kind] = now;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        const frequency = kind === 'slider' ? 360 + 540 * Math.min(1, Math.max(0, value)) : 640;
        oscillator.frequency.setValueAtTime(frequency,now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * .82,now+.045);
        gain.gain.setValueAtTime(.0001,now);
        gain.gain.exponentialRampToValueAtTime(kind === 'slider' ? .022 : .045,now+.004);
        gain.gain.exponentialRampToValueAtTime(.0001,now+.055);
        oscillator.connect(gain);gain.connect(context.destination);
        oscillator.onended = () => {oscillator.disconnect();gain.disconnect();};
        oscillator.start(now);oscillator.stop(now+.06);
        return true;
      } catch {onError('このブラウザーでは操作音を再生できません。');return false;}
    },
  };
}
export const uiSound = createUiSound({
  storage: () => globalThis.localStorage,
  createContext: () => {
    const Constructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    return Constructor ? new Constructor() : null;
  },
  onError: message => {const target=globalThis.document?.getElementById('workspaceSoundStatus');if(target)target.textContent=message;},
});
