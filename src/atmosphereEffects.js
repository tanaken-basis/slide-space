// Effects-1E: lightweight, camera-local atmosphere with foreground/background layers and particle-set mixing.
import { ParticleSystem, DynamicTexture, Vector3, Color4 } from '@babylonjs/core';
import { normalizeAtmosphereEffects } from './atmosphereSettings.js';

function createShapeTexture(scene, shape) {
  const texture = new DynamicTexture(`atmosphere-${shape}`, { width: 256, height: 256 }, scene, true, 3);
  const ctx = texture.getContext();
  // Effects-1I: 4x supersampling with mipmaps and trilinear filtering.
  // Work in the original 64x64 logical coordinate system to keep shapes identical.
  ctx.scale?.(4, 4);
  ctx.clearRect(0, 0, 64, 64);

  const radial = (r0, r1, stops) => {
    const g = ctx.createRadialGradient(32, 32, r0, 32, 32, r1);
    for (const [offset, color] of stops) g.addColorStop(offset, color);
    return g;
  };

  if (shape === 'square') {
    const g = radial(8, 28, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillStyle = g;
    ctx.fillRect(10, 10, 44, 44);
  } else if (shape === 'hexagon' || shape === 'star') {
    const vertices = shape === 'hexagon' ? 6 : 10;
    const gradient = radial(4, 31, [[0, 'rgba(255,255,255,1)'], [0.7, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,.1)']]);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < vertices; i++) {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / vertices;
      const r = shape === 'star' && i % 2 ? 12 : 27;
      const x = 32 + r * Math.cos(angle), y = 32 + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  } else if (shape === 'inner-fade-circle') {
    // Transparent center, soft luminous rim: unlike the thin outline of Ring.
    const annulus = radial(2, 31, [
      [0, 'rgba(255,255,255,0)'],
      [0.32, 'rgba(255,255,255,0)'],
      [0.52, 'rgba(255,255,255,.11)'],
      [0.72, 'rgba(255,255,255,.72)'],
      [0.84, 'rgba(255,255,255,.95)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    ctx.fillStyle = annulus;
    ctx.fillRect(0, 0, 64, 64);
  } else if (shape === 'ring') {
    // A hollow annulus, not a radial disc: transparent center remains visible.
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(32, 32, 21, 0, Math.PI * 2); ctx.stroke();
  } else if (shape === 'diamond') {
    const g = radial(5, 30, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 2); ctx.lineTo(50, 32); ctx.lineTo(32, 62); ctx.lineTo(14, 32); ctx.closePath();
    ctx.fill();
  } else if (shape === 'streak') {
    const lg = ctx.createLinearGradient(32, 4, 32, 60);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.2, 'rgba(255,255,255,.35)');
    lg.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg.addColorStop(0.8, 'rgba(255,255,255,.35)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(26, 4, 12, 56);
  } else if (shape === 'triangle') {
    const g = radial(5, 31, [[0, 'rgba(255,255,255,1)'], [0.48, 'rgba(255,255,255,.82)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 5); ctx.lineTo(58, 57); ctx.lineTo(6, 57); ctx.closePath();
    ctx.fill();
  } else {
    const gradient = radial(1, 31, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,.95)'], [0.58, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  texture.update(false);
  return texture;
}

function hexToRgb(hex) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(String(hex || '').trim()) ? String(hex).trim() : '#ffffff';
  return {
    r: parseInt(safe.slice(1, 3), 16) / 255,
    g: parseInt(safe.slice(3, 5), 16) / 255,
    b: parseInt(safe.slice(5, 7), 16) / 255,
  };
}
function rgbToColor4(rgb, alpha) { return new Color4(rgb.r, rgb.g, rgb.b, alpha); }

function getPresetProfile(preset) {
  switch (preset) {
    case 'dust':
      return {
        blendMode: ParticleSystem.BLENDMODE_STANDARD,
        alpha1: 0.68, alpha2: 0.42,
        emitRateBase: 78, capacityForeground: 800, capacityBackground: 1100,
        life: [4.5, 8.5], size: [0.13, 0.34], emitPower: [0.52, 1.0], angular: [-0.2, 0.2],
        gravity: new Vector3(0, 0.015, 0), updateSpeed: 0.012,
        direction: (windSpeed) => [new Vector3(windSpeed - 0.95, -0.16, -0.35), new Vector3(windSpeed + 0.95, 0.8, 0.6)],
        foreground: { offset: 0.7, vertical: 0.05, boxMin: new Vector3(-1.8, -1.6, -1.0), boxMax: new Vector3(1.8, 1.6, 1.2) },
        background: { offset: 11.5, vertical: 0.6, boxMin: new Vector3(-10.0, -5.0, -7.0), boxMax: new Vector3(10.0, 5.5, 7.5) },
        stretchX: [1, 1], stretchY: [1, 1],
      };
    case 'diamond-dust':
      return {
        blendMode: ParticleSystem.BLENDMODE_ADD,
        alpha1: 1.0, alpha2: 0.9,
        emitRateBase: 70, capacityForeground: 800, capacityBackground: 1000,
        life: [2.8, 5.4], size: [0.03, 0.14], emitPower: [0.34, 0.95], angular: [-1.2, 1.2],
        gravity: new Vector3(0, -0.02, 0), updateSpeed: 0.012,
        direction: (windSpeed) => [new Vector3(windSpeed - 0.46, -0.25, -0.18), new Vector3(windSpeed + 0.46, 0.5, 0.18)],
        foreground: { offset: 0.65, vertical: 0.22, boxMin: new Vector3(-1.5, -1.2, -0.9), boxMax: new Vector3(1.5, 1.4, 1.1) },
        background: { offset: 10.8, vertical: 0.8, boxMin: new Vector3(-8.5, -4.2, -5.8), boxMax: new Vector3(8.5, 4.8, 6.2) },
        stretchX: [1, 1], stretchY: [1, 1],
      };
    case 'snow':
      return {
        blendMode: ParticleSystem.BLENDMODE_STANDARD,
        alpha1: 0.94, alpha2: 0.82,
        emitRateBase: 74, capacityForeground: 850, capacityBackground: 1100,
        life: [3.0, 6.2], size: [0.09, 0.28], emitPower: [0.35, 1.05], angular: [-0.22, 0.22],
        gravity: new Vector3(0, -0.22, 0), updateSpeed: 0.012,
        direction: (windSpeed) => [new Vector3(windSpeed - 0.38, -0.7, -0.18), new Vector3(windSpeed + 0.38, -0.45, 0.18)],
        foreground: { offset: 0.9, vertical: 0.8, boxMin: new Vector3(-2.0, -1.1, -1.1), boxMax: new Vector3(2.0, 1.7, 1.4) },
        background: { offset: 12.0, vertical: 4.2, boxMin: new Vector3(-9.0, -2.0, -6.2), boxMax: new Vector3(9.0, 5.0, 6.2) },
        stretchX: [1, 1], stretchY: [1, 1],
      };
    case 'rain':
      return {
        blendMode: ParticleSystem.BLENDMODE_STANDARD,
        alpha1: 0.92, alpha2: 0.65,
        emitRateBase: 210, capacityForeground: 1200, capacityBackground: 1800,
        life: [0.85, 1.7], size: [0.055, 0.13], emitPower: [4.8, 9.4], angular: [-0.02, 0.02],
        gravity: new Vector3(0, -8.6, 0), updateSpeed: 0.02,
        direction: (windSpeed) => [new Vector3(windSpeed - 0.2, -1.95, -0.1), new Vector3(windSpeed + 0.2, -1.55, 0.1)],
        foreground: { offset: 0.8, vertical: 1.4, boxMin: new Vector3(-1.5, -0.8, -1.0), boxMax: new Vector3(1.5, 1.0, 1.0) },
        background: { offset: 10.8, vertical: 4.6, boxMin: new Vector3(-7.0, -1.0, -5.4), boxMax: new Vector3(7.0, 4.0, 5.4) },
        stretchX: [0.3, 0.55], stretchY: [3.5, 6.8],
      };
    case 'fireflies': {
      const p = getPresetProfile('sparkles');
      return { ...p, emitRateBase: 28, life: [4, 8], emitPower: [0.2, 0.48],
        gravity: new Vector3(0, 0.04, 0), alpha1: 0.88, alpha2: 0.63 };
    }
    case 'cosmic': {
      const p = getPresetProfile('sparkles');
      return { ...p, emitRateBase: 80, life: [5, 10], emitPower: [0.1, 0.4],
        alpha1: 0.64, alpha2: 0.45, gravity: new Vector3(0, 0.005, 0) };
    }
    case 'rising-bands-mix':
    case 'rising-bands': {
      const p = getPresetProfile('sparkles');
      return { ...p, blendMode: ParticleSystem.BLENDMODE_STANDARD,
        life: [12.0, 22.0], size: [0.07, 0.24], emitPower: [0.16, 0.42],
        alpha1: 0.72, alpha2: 0.52, gravity: new Vector3(0, 0.11, 0),
        direction: () => [new Vector3(-0.06, 0.42, -0.05), new Vector3(0.06, 0.72, 0.05)] };
    }
    case 'bubbles': {
      const p = getPresetProfile('sparkles');
      return { ...p, blendMode: ParticleSystem.BLENDMODE_STANDARD, emitRateBase: 34,
        life: [4, 7], size: [0.14, 0.34], emitPower: [0.18, 0.5],
        alpha1: 0.83, alpha2: 0.55, gravity: new Vector3(0, 0.11, 0) };
    }
    case 'sparkles':
    default:
      return {
        blendMode: ParticleSystem.BLENDMODE_ADD,
        alpha1: 0.98, alpha2: 0.82,
        emitRateBase: 46, capacityForeground: 750, capacityBackground: 1000,
        life: [2.2, 4.5], size: [0.055, 0.22], emitPower: [0.48, 1.15], angular: [-0.7, 0.7],
        gravity: new Vector3(0, 0.06, 0), updateSpeed: 0.014,
        direction: (windSpeed) => [new Vector3(windSpeed - 0.65, 0.18, -0.25), new Vector3(windSpeed + 0.65, 1.35, 0.45)],
        foreground: { offset: 0.6, vertical: 0.12, boxMin: new Vector3(-1.6, -1.3, -0.9), boxMax: new Vector3(1.6, 1.4, 1.0) },
        background: { offset: 11.0, vertical: 1.0, boxMin: new Vector3(-8.4, -4.0, -5.8), boxMax: new Vector3(8.4, 4.6, 5.8) },
        stretchX: [1, 1], stretchY: [1, 1],
      };
  }
}

function scaledBox(layer, distanceScale) {
  return {
    min: layer.boxMin.scale(distanceScale),
    max: layer.boxMax.scale(distanceScale),
  };
}

// Each Rising Bands strip is a separate invisible moving emitter, not a rendered mesh.
// Density controls strip count; foregroundRatio assigns whole strips, not particles.
function risingBandLayout(density, foregroundRatio) {
  const n = density <= 0 ? 0 : Math.min(14, Math.max(1, Math.round(density / 15)));
  // Foreground ratio is a per-birth probability, not a fixed quota.
  return { count: n, foregroundProbability: Math.max(0, Math.min(1, foregroundRatio / 100)) };
}

function isRisingBandPreset(name) {
  return name === 'rising-bands' || name === 'rising-bands-mix';
}

function pickWeightedParticle(particles) {
  const weights = particles.map(p => Math.max(0, Number(p?.weight) || 0));
  const total = weights.reduce((sum, n) => sum + n, 0);
  if (total <= 0) return -1;
  let draw = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    draw -= weights[i];
    if (draw < 0 && weights[i] > 0) return i;
  }
  return weights.findIndex(w => w > 0);
}

// Slow-moving particles should survive long enough to reach the viewport.
// Bounded by 4.8x the preset's lifespan to prevent unlimited particle buildup.
function atmosphereLifetimeScale(settings, isForeground) {
  const speedScale = 0.12 + settings.speed / 70;
  const foregroundScale = isForeground ? 0.05 + settings.foregroundSpeed / 100 * 0.95 : 1;
  const effectiveSpeed = speedScale * foregroundScale;
  const slowdown = Math.max(1, Math.min(3.75, 1 / Math.max(0.16, effectiveSpeed)));
  const distanceFactor = 1 + Math.max(0, settings.distance - 60) / 260;
  return Math.min(4.8, slowdown * distanceFactor);
}

function systemKey(layer, particleIndex) {
  return `${layer}-particle${particleIndex}`;
}

// Effects-1K6: this is the lifetime of an invisible *emission band*, not
// the lifetime of an individual particle (getPresetProfile(...).life).
// Each band independently pauses emission and respawns at a new horizontal
// location. Already emitted particles are allowed to finish naturally.
const RISING_BAND_LIFE_MIN = 12;      // minimum active seconds per band
const RISING_BAND_LIFE_MAX = 26;      // maximum active seconds per band
const RISING_BAND_PAUSE_MIN = 1.2;    // emission-off interval before relocation
const RISING_BAND_PAUSE_MAX = 2.8;
const RISING_BAND_FADE_IN = 1.5;      // emission ramp-up seconds
const RISING_BAND_FADE_OUT = 2.5;     // emission ramp-down seconds

function newBandCycle(now, previousFraction = null, foregroundProbability = 0.5, particles = []) {
  const front = Math.random() < foregroundProbability;
  // A wider range on the near plane, without forcing a hard central gap.
  const horizontalRange = front ? 0.96 : 0.85;
  let fraction = (Math.random() * 2 - 1) * horizontalRange;
  // Avoid respawning almost on top of the previous strip position.
  if (previousFraction !== null && Math.abs(fraction - previousFraction) < 0.38) {
    fraction = previousFraction > 0
      ? -0.35 - Math.random() * (horizontalRange - 0.35)
      : 0.35 + Math.random() * (horizontalRange - 0.35);
  }
  return {
    startedAt: now,
    front,
    particleIndex: pickWeightedParticle(particles),
    activeSeconds: RISING_BAND_LIFE_MIN + Math.random() * (RISING_BAND_LIFE_MAX - RISING_BAND_LIFE_MIN),
    pauseSeconds: RISING_BAND_PAUSE_MIN + Math.random() * (RISING_BAND_PAUSE_MAX - RISING_BAND_PAUSE_MIN),
    baseFraction: fraction,
    phase: Math.random() * Math.PI * 2,
    side: Math.random() < 0.5 ? -1 : 1,
    swayFrequency: 0.28 + Math.random() * 0.30,
  };
}

function updateBandCycle(state, now, foregroundProbability = 0.5, particles = []) {
  if (now >= state.startedAt + state.activeSeconds + state.pauseSeconds) {
    // Keep the same logical band and ParticleSystems: no allocations per cycle.
    const fresh = newBandCycle(now, state.baseFraction, foregroundProbability, particles);
    Object.assign(state, fresh);
    state.generation = (state.generation ?? 0) + 1;
  }
  // Each band has a random *initial* delay; no particles until it begins.
  if (now < state.startedAt) return 0;
  const age = Math.max(0, now - state.startedAt);
  if (age >= state.activeSeconds) return 0;
  const fadeIn = Math.min(1, age / RISING_BAND_FADE_IN);
  const fadeOut = Math.min(1, (state.activeSeconds - age) / RISING_BAND_FADE_OUT);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

export function createAtmosphereEffects(scene, getCamera) {
  let systems = null;
  let textures = null;
  let preset = 'off';
  let lastShapeSignature = '';
  const emitters = { foreground: new Vector3(), background: new Vector3() };
  const position = new Vector3();
  const forward = new Vector3();
  let disposed = false;
  let settings = normalizeAtmosphereEffects();
  let bandTime = 0;
  let bandEmitters = [];
  let retiredBandSystems = [];
  let lastBandCount = -1;
  let lastBandVariantSignature = '';
  const upAxis = new Vector3(0, 1, 0);
  const right = new Vector3();

  const syncEmitters = () => {
    const camera = getCamera();
    if (!systems || !camera) return;
    camera.getWorldMatrix?.();
    const eye = camera.globalPosition ?? camera.position;
    if (!eye) return;
    position.copyFrom(eye);
    if (typeof camera.getDirection === 'function') forward.copyFrom(camera.getDirection(Vector3.Forward()));
    else forward.copyFrom(Vector3.Forward());
    if (forward.lengthSquared() < 1e-12) forward.copyFrom(Vector3.Forward());
    forward.normalize();
    const profile = getPresetProfile(preset);
    const distanceScale = 0.18 + settings.distance / 85;
    if (isRisingBandPreset(preset)) {
      const dt = scene.getEngine?.().getDeltaTime?.() ?? 16.67;
      bandTime += Math.min(0.05, Math.max(0, dt / 1000));
      Vector3.CrossToRef(upAxis, forward, right);
      if (right.lengthSquared() < 1e-10) right.set(1, 0, 0);
      right.normalize();
      const layout = risingBandLayout(settings.density, settings.foregroundRatio);
      // Convert approximate screen width to world units at each strip depth.
      // Using the same world-space width at both depths made near strips leave
      // the viewport while distant strips clustered in the middle.
      const engine = scene.getEngine?.();
      const renderHeight = engine?.getRenderHeight?.() || 720;
      const aspect = (engine?.getRenderWidth?.() || renderHeight * 16 / 9) / renderHeight;
      const tanHalfFov = Math.tan((camera.fov || 0.8) * 0.5);
      let cycleChanged = false;
      for (const band of bandEmitters) {
        // In Mixed mode, all variants share the same cycle and birth decisions.
        const cycle = band.cycle;
        if (cycle.lastUpdateAt !== bandTime) {
          cycle.activity = updateBandCycle(cycle, bandTime,
            layout.foregroundProbability, settings.particles);
          cycle.lastUpdateAt = bandTime;
        }
        if (band.appliedGeneration !== cycle.generation) cycleChanged = true;
      }
      if (cycleChanged) {
        // A system's rendering group and texture are shared by every particle
        // it has already emitted. Never mutate that system for a new birth.
        for (const band of bandEmitters) {
          if (band.appliedGeneration !== band.cycle.generation) replaceBandGeneration(band);
        }
        configureRisingBandSystems();
      }
      // Retired systems keep their original texture, color, and render layer
      // until the particles from that generation naturally disappear.
      retiredBandSystems = retiredBandSystems.filter(({ system, retiredAt, maxLife }) => {
        const remaining = system.getActiveCount?.();
        const expired = bandTime - retiredAt > Math.max(1, maxLife * 1.5);
        if ((remaining === 0 && bandTime - retiredAt > 0.5) ||
            (remaining === undefined && expired)) {
          system.stop();
          system.dispose(false);
          return false;
        }
        return true;
      });
      for (const band of bandEmitters) {
        const cycle = band.cycle;
        const i = band.bandIndex;
        const phase = cycle.phase;
        const age = bandTime - cycle.startedAt;
        const depth = band.front ? 0.95 * distanceScale : 8.8 * distanceScale;
        const halfViewWidth = Math.max(0.15, depth * tanHalfFov * aspect);
        const baseSpan = halfViewWidth * (band.front ? 0.70 : 0.98);
        const baseX = cycle.baseFraction * baseSpan;
        const sway = Math.sin(age * cycle.swayFrequency + phase) * halfViewWidth * (band.front ? 0.11 : 0.22);
        let x = baseX + sway;
        if (band.front) {
          // The central corridor is passable, but has gentle repulsion.
          const centerSoftZone = halfViewWidth * 0.14;
          const distanceFromCenter = Math.abs(x);
          if (distanceFromCenter < centerSoftZone) {
            const preferred = Math.sign(Math.sin(age * (cycle.swayFrequency + 0.24) + phase * 1.7) + cycle.side * 0.45) || cycle.side;
            const push = (1 - distanceFromCenter / centerSoftZone) * centerSoftZone * 0.88;
            x += preferred * push;
          }
        }
        const depthSway = Math.sin(age * .23 + phase) * depth * (band.front ? 0.04 : 0.08);
        band.emitter.copyFrom(position)
          .addInPlace(forward.scale(depth + depthSway))
          .addInPlace(right.scale(x));
        band.emitter.y -= (band.front ? 2.3 : 5.6) * distanceScale;
        band.system.emitter = band.emitter;
        // Stop spawning briefly before relocation. Existing particles keep
        // their current trajectories and finish their own lifetimes.
        band.system.emitRate = (band.baseEmitRate ?? 0) * cycle.activity;
      }
      return;
    }
    for (const layerName of ['foreground', 'background']) {
      const layer = profile[layerName];
      emitters[layerName].copyFrom(position).addInPlace(forward.scale(layer.offset * distanceScale));
      emitters[layerName].y += layer.vertical * distanceScale;
    }
    for (const [key, system] of Object.entries(systems)) {
      system.emitter = key.startsWith('foreground') ? emitters.foreground : emitters.background;
    }
  };
  const observer = scene.onBeforeRenderObservable.add(syncEmitters);

  function clear() {
    if (systems) {
      for (const system of Object.values(systems)) {
        system.stop();
        system.dispose(false);
      }
      systems = null;
      bandEmitters = [];
      lastBandCount = -1;
      lastBandVariantSignature = '';
    }
    for (const { system } of retiredBandSystems) {
      system.stop();
      system.dispose(false);
    }
    retiredBandSystems = [];
    if (textures) {
      for (const texture of Object.values(textures)) texture?.dispose?.();
      textures = null;
    }
  }

  function createRisingBandSystems() {
    const layout = risingBandLayout(settings.density, settings.foregroundRatio);
    lastBandCount = layout.count;
    lastBandVariantSignature = settings.particles.map(p => p.weight).join('|');
    textures = Object.fromEntries(settings.particles.map((p, i) => [`particle${i + 1}`, createShapeTexture(scene, p.shape)]));
    systems = {};
    bandEmitters = [];
    const totalWeight = settings.particles.reduce((sum, p) => sum + p.weight, 0);
    const weights = settings.particles.map(p => totalWeight > 0 ? p.weight / totalWeight : 0);
    const mixed = preset === 'rising-bands-mix';
    for (let i = 0; i < layout.count; i++) {
      // Random decisions occur on the first birth AND on each later rebirth.
      // Initial delays mean all strips do not suddenly appear at once.
      const cycle = newBandCycle(bandTime + Math.random() * 6, null,
        layout.foregroundProbability, settings.particles);
      cycle.generation = 0;
      cycle.activity = 0;
      const front = cycle.front;
      // One system per strip generation; retired generations remain visible
      // without changing texture or render group.
      const selected = cycle.particleIndex;
      const variants = mixed ? weights.map((w, index) => ({ index, weight: w })).filter(v => v.weight > 0)
        : selected < 0 ? [] : [{ index: selected, weight: 1 }];
      for (const variant of variants) {
        const key = mixed ? `band-${i}-particle${variant.index + 1}` : `band-${i}`;
        const system = new ParticleSystem(`atmosphere-${preset}-${key}`, mixed ? 180 : 240, scene);
        system.particleTexture = textures[`particle${variant.index + 1}`];
        system.createBoxEmitter(new Vector3(-.04, .75, -.04), new Vector3(.04, 1.25, .04),
          front ? new Vector3(-.07, 0, -.08) : new Vector3(-.24, 0, -.2),
          front ? new Vector3(.07, .55, .08) : new Vector3(.24, 4.3, .2));
        const band = { system, key, emitter: new Vector3(), bandIndex: i, cycle, baseEmitRate: 0,
          particleIndex: variant.index, front, weight: variant.weight, appliedGeneration: 0 };
        bandEmitters.push(band);
        system.renderingGroupId = front ? 3 : 0;
        systems[key] = system;
      }
    }
  }

  function replaceBandGeneration(band) {
    const previous = band.system;
    // Stop only new emission; do NOT reset existing particles or change the
    // old generation's renderingGroupId, texture, or colors.
    previous.emitRate = 0;
    previous.emitter = new Vector3().copyFrom(band.emitter);
    retiredBandSystems.push({ system: previous, retiredAt: bandTime,
      maxLife: previous.maxLifeTime ?? 25 });
    const selected = preset === 'rising-bands' ? band.cycle.particleIndex : band.particleIndex;
    const next = new ParticleSystem(
      `atmosphere-${preset}-${band.key}-generation${band.cycle.generation}`,
      preset === 'rising-bands-mix' ? 180 : 240, scene);
    next.particleTexture = textures[`particle${selected + 1}`];
    next.createBoxEmitter(new Vector3(-.04, .75, -.04), new Vector3(.04, 1.25, .04),
      band.cycle.front ? new Vector3(-.07, 0, -.08) : new Vector3(-.24, 0, -.2),
      band.cycle.front ? new Vector3(.07, .55, .08) : new Vector3(.24, 4.3, .2));
    band.system = next;
    band.particleIndex = selected;
    band.front = band.cycle.front;
    band.appliedGeneration = band.cycle.generation;
    systems[band.key] = next;
    next.start();
  }

  function createSystemsForCurrentShapes() {
    if (isRisingBandPreset(preset)) { createRisingBandSystems(); return; }
    const profile = getPresetProfile(preset);
    textures = Object.fromEntries(settings.particles.map((p, i) => [`particle${i + 1}`, createShapeTexture(scene, p.shape)]));
    systems = {};
    for (const layerName of ['foreground', 'background']) {
      const capacity = layerName === 'foreground' ? profile.capacityForeground : profile.capacityBackground;
      for (let particleIndex = 1; particleIndex <= settings.particles.length; particleIndex++) {
        const key = systemKey(layerName, particleIndex);
        const system = new ParticleSystem(`atmosphere-${preset}-${key}`, Math.max(120, Math.round(capacity / settings.particles.length)), scene);
        system.particleTexture = textures[`particle${particleIndex}`];
        system.createBoxEmitter(new Vector3(-1, -1, -1), new Vector3(1, 1, 1), new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
        system.renderingGroupId = layerName === 'foreground' ? 3 : 0;
        systems[key] = system;
      }
    }
  }

  function configureSingleSystem(system, profile, layerName, particleIndex, share, distanceScale, colors, scales) {
    const layer = profile[layerName];
    const box = scaledBox(layer, distanceScale);
    // Clear already-spawned particles when a variant or whole layer reaches zero.
    // Merely setting emitRate=0 leaves old particles visible until their lifespan ends.
    if (share <= 0 && system.emitRate > 0) system.reset?.();
    system.emitRate = Math.max(0, scales.totalRate * share);
    const lifetimeScale = atmosphereLifetimeScale(settings, layerName === 'foreground');
    system.minLifeTime = profile.life[0] * lifetimeScale;
    system.maxLifeTime = profile.life[1] * lifetimeScale;
    const layerSizeScale = layerName === 'foreground' ? scales.foregroundSizeScale : 1;
    const layerSpeedScale = layerName === 'foreground' ? scales.foregroundSpeedScale : 1;
    system.minSize = profile.size[0] * scales.sizeScale * layerSizeScale;
    system.maxSize = profile.size[1] * scales.sizeScale * layerSizeScale;
    system.minEmitPower = profile.emitPower[0] * scales.speedScale * layerSpeedScale;
    system.maxEmitPower = profile.emitPower[1] * scales.speedScale * layerSpeedScale;
    system.minAngularSpeed = profile.angular[0];
    system.maxAngularSpeed = profile.angular[1];
    system.gravity.copyFrom(profile.gravity.scale(layerSpeedScale));
    system.updateSpeed = profile.updateSpeed;
    system.particleEmitterType.direction1 = scales.dir1.scale(layerSpeedScale);
    system.particleEmitterType.direction2 = scales.dir2.scale(layerSpeedScale);
    system.particleEmitterType.minEmitBox = box.min;
    system.particleEmitterType.maxEmitBox = box.max;
    const color = colors[particleIndex - 1];
    const alpha = particleIndex === 1 ? profile.alpha1 : profile.alpha2;
    system.color1 = rgbToColor4(color, alpha);
    system.color2 = rgbToColor4(color, Math.max(0, alpha * 0.88));
    system.colorDead = rgbToColor4(color, 0);
    system.blendMode = profile.blendMode;
    const shape = settings.particles[particleIndex - 1].shape;
    const shapeStretch = shape === 'streak' ? { x: [0.28, 0.6], y: [2.8, 6.2] } : { x: profile.stretchX, y: profile.stretchY };
    system.minScaleX = shapeStretch.x[0];
    system.maxScaleX = shapeStretch.x[1];
    system.minScaleY = shapeStretch.y[0];
    system.maxScaleY = shapeStretch.y[1];
  }

  function configureRisingBandSystems() {
    const profile = getPresetProfile(preset);
    const layout = risingBandLayout(settings.density, settings.foregroundRatio);
    const sizeScale = .18 + settings.size / 80;
    const speedScale = .12 + settings.speed / 70;
    const foregroundSizeScale = 0.05 + (settings.foregroundSize / 100) * 0.95;
    const foregroundSpeedScale = 0.05 + (settings.foregroundSpeed / 100) * 0.95;
    const totalWeight = settings.particles.reduce((sum, p) => sum + p.weight, 0);
    const windSpeed = settings.wind * .012;
    const radians = settings.windDirection * Math.PI / 180;
    const drift = new Vector3(Math.sin(radians) * windSpeed, 0, Math.cos(radians) * windSpeed);
    for (let i = 0; i < bandEmitters.length; i++) {
      const band = bandEmitters[i];
      const system = band.system;
      // Identity changes only at birth, not on every foreground-ratio edit.
      // In mixed mode the variants keep their particle indices, but share layer.
      band.front = band.cycle.front;
      band.appliedGeneration = band.cycle.generation;
      // Shape is fixed when this generation is created. Existing particles
      // must never inherit the next generation's texture.
      system.renderingGroupId = band.front ? 3 : 0;
      system.particleEmitterType.minEmitBox = band.front
        ? new Vector3(-.07, 0, -.08) : new Vector3(-.24, 0, -.2);
      system.particleEmitterType.maxEmitBox = band.front
        ? new Vector3(.07, .55, .08) : new Vector3(.24, 4.3, .2);
      const variant = settings.particles[band.particleIndex];
      const weight = totalWeight > 0 ? variant.weight / totalWeight : 0;
      const mixed = preset === 'rising-bands-mix';
      band.baseEmitRate = weight === 0 ? 0 : (9 + settings.density * .11) * (mixed ? weight : 1);
      system.emitRate = band.baseEmitRate * (band.cycle.activity ?? 1);
      const lifetimeScale = atmosphereLifetimeScale(settings, band.front);
      system.minLifeTime = profile.life[0] * lifetimeScale;
      system.maxLifeTime = profile.life[1] * lifetimeScale;
      const layerSizeScale = band.front ? foregroundSizeScale : 2.7;
      const layerSpeedScale = band.front ? foregroundSpeedScale : 1;
      system.minSize = profile.size[0] * sizeScale * layerSizeScale;
      system.maxSize = profile.size[1] * sizeScale * layerSizeScale;
      system.minEmitPower = profile.emitPower[0] * speedScale * layerSpeedScale;
      system.maxEmitPower = profile.emitPower[1] * speedScale * layerSpeedScale;
      system.minAngularSpeed = profile.angular[0];
      system.maxAngularSpeed = profile.angular[1];
      system.gravity.copyFrom(profile.gravity.scale(layerSpeedScale));
      system.updateSpeed = profile.updateSpeed;
      const crossWind = band.front ? 0.12 : 1;
      system.particleEmitterType.direction1 = new Vector3((-.045 + drift.x * crossWind) * layerSpeedScale, .85 * layerSpeedScale, (-.045 + drift.z * crossWind) * layerSpeedScale);
      system.particleEmitterType.direction2 = new Vector3((.045 + drift.x * crossWind) * layerSpeedScale, 1.25 * layerSpeedScale, (.045 + drift.z * crossWind) * layerSpeedScale);
      const rgb = hexToRgb(variant.color);
      system.color1 = rgbToColor4(rgb, profile.alpha1);
      system.color2 = rgbToColor4(rgb, profile.alpha2);
      system.colorDead = rgbToColor4(rgb, 0);
      system.blendMode = profile.blendMode;
      system.minScaleX = system.maxScaleX = 1;
      system.minScaleY = system.maxScaleY = 1;
    }
  }

  function configureSystems() {
    if (!systems) return;
    if (isRisingBandPreset(preset)) { configureRisingBandSystems(); return; }
    const { density, size, speed, wind, foregroundRatio, foregroundSize, foregroundSpeed, distance, particles } = settings;
    const profile = getPresetProfile(preset);
    const densityScale = 0.15 + density / 50;
    const sizeScale = 0.18 + size / 80;
    const speedScale = 0.12 + speed / 70;
    const foregroundSizeScale = 0.05 + (foregroundSize / 100) * 0.95;
    const foregroundSpeedScale = 0.05 + (foregroundSpeed / 100) * 0.95;
    const distanceScale = 0.18 + distance / 85;
    const windSpeed = wind * 0.012;
    const radians = (settings.windDirection % 360) * Math.PI / 180;
    // 0=N(+Z), 90=E(+X), 180=S(-Z), 270=W(-X), in world space.
    const windX = Math.sin(radians) * windSpeed;
    const windZ = Math.cos(radians) * windSpeed;
    const [dir1, dir2] = profile.direction(0);
    for (const dir of [dir1, dir2]) { dir.x += windX; dir.z += windZ; }
    const totalRate = Math.max(0, profile.emitRateBase * densityScale);
    const fgShare = foregroundRatio / 100;
    const bgShare = 1 - fgShare;
    const totalWeight = particles.reduce((sum, p) => sum + p.weight, 0);
    const colors = particles.map(p => hexToRgb(p.color));
    const scales = { sizeScale, speedScale, dir1, dir2, totalRate, foregroundSizeScale, foregroundSpeedScale };

    const shares = {
      foreground: fgShare,
      background: bgShare,
      ...Object.fromEntries(particles.map((p, i) => [`particle${i + 1}`, totalWeight > 0 ? p.weight / totalWeight : 0])),
    };
    for (const layerName of ['foreground', 'background']) {
      for (let particleIndex = 1; particleIndex <= settings.particles.length; particleIndex++) {
        const key = systemKey(layerName, particleIndex);
        const share = shares[layerName] * shares[`particle${particleIndex}`];
        configureSingleSystem(systems[key], profile, layerName, particleIndex, share, distanceScale, colors, scales);
      }
    }
  }

  function setSettings(value) {
    const next = normalizeAtmosphereEffects(value);
    if (disposed) return;
    const shapeSignature = next.particles.map(p => p.shape).join('|');
    const changedPreset = next.preset !== preset;
    const changedShapes = shapeSignature !== lastShapeSignature;
    const changedBandCount = isRisingBandPreset(next.preset) && risingBandLayout(next.density, next.foregroundRatio).count !== lastBandCount;
    const changedBandWeights = isRisingBandPreset(next.preset) && next.particles.map(p => p.weight).join('|') !== lastBandVariantSignature;
    settings = next;
    if (changedPreset || changedShapes || changedBandCount || changedBandWeights) {
      clear();
      preset = next.preset;
      lastShapeSignature = shapeSignature;
      if (preset !== 'off') createSystemsForCurrentShapes();
    }
    configureSystems();
    if (systems) {
      syncEmitters();
      if (changedPreset || changedShapes || changedBandCount || changedBandWeights) {
        for (const system of Object.values(systems)) system.start();
      }
    }
  }

  function setPreset(value) { setSettings({ ...settings, preset: value }); }
  return {
    setPreset,
    setSettings,
    getSettings: () => ({ ...settings }),
    getPreset: () => preset,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.onBeforeRenderObservable.remove(observer);
      clear();
    },
  };
}
