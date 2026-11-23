// Scene-4E: preserves legacy speed easing while Duration uses elapsed time.
export const DEFAULT_DURATION_SECONDS = 2;
export const transitionTiming = (transition, direction = 'current') => {
  const name = ['previous','current','next'].includes(direction) ? direction : 'current';
  const speed = Number(transition?.[`${name}Speed`]);
  const duration = Number(transition?.[`${name}Duration`]);
  return {
    mode: transition?.mode === 'duration' ? 'duration' : 'speed',
    speed: Number.isFinite(speed) && speed >= 0 ? speed : 5,
    duration: Number.isFinite(duration) && duration >= 0 ? Math.min(duration, 120) : DEFAULT_DURATION_SECONDS,
  };
};
export const durationProgress = (elapsedSeconds, durationSeconds) =>
  durationSeconds === 0 ? 1 : Math.max(0, Math.min(1, elapsedSeconds / durationSeconds));
