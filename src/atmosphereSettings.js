// Effects-1G: project-wide settings with up to four weighted particle definitions.
export const ATMOSPHERE_PRESETS = Object.freeze([
  'off', 'dust', 'sparkles', 'rain', 'snow', 'diamond-dust',
  'fireflies', 'cosmic', 'bubbles', 'rising-bands', 'rising-bands-mix',
]);
export const ATMOSPHERE_SHAPES = Object.freeze([
  'soft-circle', 'triangle', 'square', 'hexagon', 'star', 'ring', 'inner-fade-circle', 'diamond', 'streak',
]);

const particle = (color = '#ffffff', shape = 'soft-circle', weight = 0) => ({ color, shape, weight });
const common = {
  density: 55, size: 55, speed: 55, wind: 0, windDirection: 90,
  distance: 85, foregroundRatio: 35, foregroundSize: 72, foregroundSpeed: 65,
};
// Select a preset to apply its recommended appearance and proportions, then adjust freely.
export const ATMOSPHERE_PRESET_SETTINGS = Object.freeze({
  off: { ...common, particles: [particle('#ffffff', 'soft-circle', 50), particle('#ffffff', 'soft-circle', 50)] },
  dust: { ...common, density: 58, size: 34, speed: 27, foregroundRatio: 22, particles: [particle('#f7eacb', 'soft-circle', 70), particle('#b9c7d5', 'soft-circle', 30)] },
  sparkles: { ...common, density: 72, size: 43, speed: 40, foregroundRatio: 32, particles: [particle('#9bd8ff', 'soft-circle', 42), particle('#f6d274', 'star', 43), particle('#ffffff', 'diamond', 15)] },
  rain: { ...common, density: 88, size: 40, speed: 110, foregroundRatio: 30, particles: [particle('#d3e7ff', 'streak', 80), particle('#83a8dc', 'streak', 20)] },
  snow: { ...common, density: 66, size: 47, speed: 31, foregroundRatio: 35, particles: [particle('#ffffff', 'soft-circle', 65), particle('#d9eeff', 'hexagon', 35)] },
  'diamond-dust': { ...common, density: 70, size: 31, speed: 31, foregroundRatio: 27, particles: [particle('#eefaff', 'diamond', 45), particle('#b9e5ff', 'star', 40), particle('#fff6e1', 'hexagon', 15)] },
  fireflies: { ...common, density: 25, size: 62, speed: 23, foregroundRatio: 45, particles: [particle('#ffe47c', 'soft-circle', 65), particle('#ffd063', 'star', 25), particle('#e4ff9b', 'ring', 10)] },
  cosmic: { ...common, density: 105, size: 65, speed: 22, foregroundRatio: 28, particles: [particle('#6555ff', 'soft-circle', 45), particle('#36c9e9', 'ring', 24), particle('#f8b8ff', 'star', 22), particle('#fff5db', 'hexagon', 9)] },
  bubbles: { ...common, density: 45, size: 75, speed: 28, foregroundRatio: 38, foregroundSize: 68, particles: [particle('#8fe7ff', 'inner-fade-circle', 68), particle('#d9f9ff', 'inner-fade-circle', 22), particle('#ffffff', 'soft-circle', 10)] },
  'rising-bands': { ...common, density: 75, size: 42, speed: 30, wind: 12, windDirection: 90, distance: 83, foregroundRatio: 32, foregroundSize: 56, foregroundSpeed: 45, particles: [particle('#bfeeff', 'inner-fade-circle', 45), particle('#e9c1ff', 'soft-circle', 35), particle('#fff0b4', 'star', 20)] },
  'rising-bands-mix': { ...common, density: 75, size: 42, speed: 30, wind: 9, windDirection: 90, distance: 83, foregroundRatio: 32, foregroundSize: 56, foregroundSpeed: 45, particles: [particle('#a4eaff', 'inner-fade-circle', 38), particle('#e7c4ff', 'soft-circle', 32), particle('#ffebb2', 'star', 19), particle('#92c9ff', 'ring', 11)] },
});
export const ATMOSPHERE_DEFAULTS = Object.freeze({ preset: 'off', ...common, particles: ATMOSPHERE_PRESET_SETTINGS.off.particles });

function decimal(value, fallback, low = 0, high = 100) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(low, Math.min(high, Math.round(n * 10) / 10)) : fallback;
}
function color(value, fallback = '#ffffff') {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}
function shape(value, fallback = 'soft-circle') {
  if (value === 'asteroid') return 'triangle';
  return ATMOSPHERE_SHAPES.includes(value) ? value : fallback;
}
export function getAtmospherePresetSettings(preset) {
  const name = ATMOSPHERE_PRESETS.includes(preset) ? preset : 'off';
  const source = ATMOSPHERE_PRESET_SETTINGS[name];
  return { preset: name, ...source, particles: source.particles.map(p => ({ ...p })) };
}
function oldParticles(source) {
  let color1 = source.color1;
  let color2 = source.color2;
  if (source.preset === 'sparkles-gold') { color1 ??= '#ffe39a'; color2 ??= '#fff6d4'; }
  if (source.preset === 'sparkles-blue') { color1 ??= '#b8e6ff'; color2 ??= '#eefbff'; }
  const ratio = decimal(source.particle1Ratio ?? source.shapeMix ?? source.colorMix, 50);
  return [
    particle(color(color1), shape(source.shape1), ratio),
    particle(color(color2), shape(source.shape2), Math.round((100 - ratio) * 10) / 10),
  ];
}
export function normalizeAtmosphereEffects(value) {
  const source = value && typeof value === 'object' ? value : {};
  let preset = source.preset;
  if (preset === 'sparkles-gold' || preset === 'sparkles-blue') preset = 'sparkles';
  if (!ATMOSPHERE_PRESETS.includes(preset)) preset = 'off';
  const base = getAtmospherePresetSettings(preset);
  const fromNew = Array.isArray(source.particles);
  const rawParticles = fromNew ? source.particles : (
    (source.preset === 'sparkles-gold' || source.preset === 'sparkles-blue' || ['color1', 'color2', 'shape1', 'shape2', 'particle1Ratio', 'shapeMix', 'colorMix'].some(k => Object.hasOwn(source, k)))
      ? oldParticles(source) : base.particles
  );
  const particles = rawParticles.slice(0, 4).map((p, i) => ({
    color: color(p?.color, '#ffffff'),
    shape: shape(p?.shape),
    weight: decimal(p?.weight, i === 0 ? 100 : 0),
  }));
  if (!particles.length) particles.push(particle('#ffffff', 'soft-circle', 100));
  return {
    preset,
    density: decimal(source.density, base.density, 0, 200),
    size: decimal(source.size, base.size, 0, 200),
    speed: decimal(source.speed, base.speed, 0, 200),
    wind: decimal(Math.abs(Number(source.wind ?? base.wind)), base.wind, 0, 200),
    windDirection: decimal(source.windDirection, Number(source.wind) < 0 ? 270 : base.windDirection, 0, 360),
    distance: decimal(source.distance, base.distance, 0, 200),
    foregroundRatio: decimal(source.foregroundRatio, base.foregroundRatio, 0, 100),
    foregroundSize: decimal(source.foregroundSize, base.foregroundSize, 0, 100),
    foregroundSpeed: decimal(source.foregroundSpeed, base.foregroundSpeed, 0, 100),
    particles,
  };
}
