import { normalizeAtmosphereEffects } from "./atmosphereSettings.js";
import { normalizeSkyboxLibrary } from "./skyboxLibrary.js";
import { normalizeCameraFramingOffset } from "./cameraFramingOffset.js";
import { normalizeAssetLibrary } from "./assetLibrary.js";
import { normalizeAudioAssets } from "./audioLibrary.js";
// ============================================================
// Project Data
// ============================================================
//
// project.json の default値・normalization を扱う。
//
// このmoduleでは、DOM / Babylon Scene / Mesh / Audio /
// Application Runtime State を扱わない。
// Plain JavaScript Data の変換だけを担当する。
// ============================================================

// ============================================================
// Constants
// ============================================================

export const DEFAULT_PRESENTATION_BGM_CROSSFADE_SECONDS = 1.5;

// ============================================================
// BGM Normalization
// ============================================================

export const normalizeProjectBgm = function (value) {
  const source = value && typeof value === "object" ? value : {};

  const volume =
    typeof source.volume === "number" && Number.isFinite(source.volume)
      ? source.volume
      : 0.35;

  const fadeSeconds =
    typeof source.fadeSeconds === "number" &&
    Number.isFinite(source.fadeSeconds)
      ? source.fadeSeconds
      : DEFAULT_PRESENTATION_BGM_CROSSFADE_SECONDS;

  return {
    enabled: source.enabled === true,

    soundId: typeof source.soundId === "string" ? source.soundId.trim() : "",

    volume: Math.min(1, Math.max(0, volume)),

    loop: typeof source.loop === "boolean" ? source.loop : true,

    fadeSeconds: Math.min(10, Math.max(0, fadeSeconds)),
  };
};

// ============================================================
// Slide Scale Normalization
// ============================================================

export const normalizeSlideScale = function (value) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  // Scene-2G: legacy projects without a depth scale continue at z = 1.
  const z = Number(value?.z);

  return {
    x: Number.isFinite(x) && x > 0 ? x : 1,
    y: Number.isFinite(y) && y > 0 ? y : 1,
    z: Number.isFinite(z) && z > 0 ? z : 1,
  };
};

// ============================================================
// BGM Override Normalization
// ============================================================

export const normalizeSlideBgmOverride = function (value) {
  const source = value && typeof value === "object" ? value : {};

  const result = {};

  if (typeof source.enabled === "boolean") {
    result.enabled = source.enabled;
  }

  if (typeof source.soundId === "string") {
    result.soundId = source.soundId.trim();
  }

  if (typeof source.volume === "number" && Number.isFinite(source.volume)) {
    result.volume = Math.min(1, Math.max(0, source.volume));
  }

  if (typeof source.loop === "boolean") {
    result.loop = source.loop;
  }
  for (const key of ["fadeInSeconds", "fadeOutSeconds"]) {
    if (Number.isFinite(source[key])) result[key] = Math.max(0, Math.min(10, source[key]));
  }
  if (typeof source.continueSameTrack === "boolean") result.continueSameTrack = source.continueSameTrack;

  return result;
};

export const normalizeScenePresetBgm = function (value) {
  const source = value && typeof value === "object" ? value : {};

  const result = {};

  if (typeof source.enabled === "boolean") {
    result.enabled = source.enabled;
  }

  // The scene is the root BGM configuration; a blank track means no audio.
  if (typeof source.soundId === "string" && source.soundId.trim()) {
    result.soundId = source.soundId.trim();
  }

  if (typeof source.volume === "number" && Number.isFinite(source.volume)) {
    result.volume = Math.min(1, Math.max(0, source.volume));
  }

  if (typeof source.loop === "boolean") {
    result.loop = source.loop;
  }

  for (const key of ["fadeInSeconds", "fadeOutSeconds"]) {
    if (Number.isFinite(source[key])) result[key] = Math.max(0, Math.min(10, source[key]));
  }
  if (typeof source.continueSameTrack === "boolean") result.continueSameTrack = source.continueSameTrack;
  return result;
};

// ============================================================
// AutoPlay Override Normalization
// ============================================================

export const normalizeSlideAutoPlayOverride = function (value) {
  const source = value && typeof value === "object" ? value : {};

  const result = {};

  if (
    typeof source.intervalSeconds === "number" &&
    Number.isFinite(source.intervalSeconds)
  ) {
    result.intervalSeconds = Math.min(
      3600,
      Math.max(0.1, source.intervalSeconds),
    );
  }

  return result;
};

// ============================================================
// Project Defaults
// ============================================================

export const createDefaultProjectData = function () {
  return {
    version: 1,

    name: "Untitled",

    bgm: normalizeProjectBgm(),

    // Scene BGM is the source of truth; slides may override it.
    bgmSourceMode: "scene",

    presentationSettings: normalizePresentationSettings(),

    cameraFramingOffset: normalizeCameraFramingOffset(),
    atmosphereEffects: normalizeAtmosphereEffects(),

    label: "",

    scenePresets: {
      default: {
        assets: [],
        atmosphereEffects: normalizeAtmosphereEffects(),

        environment: {
          useSkybox: false,

          turbidity: 10,

          inclination: 0.15,

          azimuth: 0.35,

          fogColor: [0.8, 0.85, 0.9],

          fogDensity: 0.001,
        },
      },
    },

    transitionPresets: {
      default: {
        previousSpeed: 5,

        currentSpeed: 10,

        nextSpeed: 5,
      },
    },

    assetLibrary: [],

    skyboxLibrary: [],

    audioAssets: {},

    soundAssets: {
      OK: "sound/ok.mp3",

      NG: "sound/ng.mp3",

      PREVIOUS: "sound/previous.mp3",

      CURRENT: "sound/current.mp3",

      NEXT: "sound/next.mp3",

      WARP: "sound/warp.mp3",

      SWITCH: "sound/switch.mp3",

      GEN: "sound/gen.mp3",

      PHOTO: "sound/photo.mp3",
    },

    soundPresets: {
      default: {
        previous: "PREVIOUS",

        current: "CURRENT",

        next: "NEXT",
      },
    },

    slides: [],
  };
};

// ============================================================
// Project Normalization
// ============================================================

export const normalizePresentationSettings = function (value) {
  const source = value && typeof value === "object" ? value : {};

  const validStartModes = new Set(["current", "first"]);

  const validHudModes = new Set(["always", "auto-dim", "bar-linked", "off"]);

  const validTimeModes = new Set(["elapsed", "clock", "off"]);

  const autoPlayIntervalSeconds = Number(source.autoPlayIntervalSeconds);

  return {
    startMode: validStartModes.has(source.startMode)
      ? source.startMode
      : "current",

    loop: typeof source.loop === "boolean" ? source.loop : true,

    autoFullscreen:
      typeof source.autoFullscreen === "boolean"
        ? source.autoFullscreen
        : false,

    hudMode: validHudModes.has(source.hudMode) ? source.hudMode : "auto-dim",

    timeMode: validTimeModes.has(source.timeMode) ? source.timeMode : "elapsed",

    autoPlayOnStart:
      typeof source.autoPlayOnStart === "boolean"
        ? source.autoPlayOnStart
        : false,

    autoPlayIntervalSeconds:
      Number.isFinite(autoPlayIntervalSeconds) && autoPlayIntervalSeconds >= 1
        ? autoPlayIntervalSeconds
        : 8,
  };
};

export const normalizeProjectData = function (data) {
  const defaults = createDefaultProjectData();

  if (!data || typeof data !== "object") {
    return defaults;
  }

  const defaultPreset = defaults.scenePresets.default;

  const sourceDefaultPreset = data.scenePresets?.default ?? {};

  const normalized = {
    ...defaults,

    ...data,

    name: data.name ?? defaults.name,

    bgm: normalizeProjectBgm(data.bgm),
    assetLibrary: normalizeAssetLibrary(data.assetLibrary),
    skyboxLibrary: normalizeSkyboxLibrary(data.skyboxLibrary),
    bgmSourceMode: "scene",

    presentationSettings: normalizePresentationSettings(
      data.presentationSettings,
    ),
    cameraFramingOffset: normalizeCameraFramingOffset(data.cameraFramingOffset),
    atmosphereEffects: normalizeAtmosphereEffects(data.atmosphereEffects),

    scenePresets: {
      ...defaults.scenePresets,

      ...(data.scenePresets ?? {}),

      default: {
        ...defaultPreset,

        ...sourceDefaultPreset,

        atmosphereEffects: normalizeAtmosphereEffects(
          sourceDefaultPreset.atmosphereEffects ?? data.atmosphereEffects,
        ),

        assets: Array.isArray(sourceDefaultPreset.assets)
          ? sourceDefaultPreset.assets
          : [],

        environment: {
          ...defaultPreset.environment,

          ...(sourceDefaultPreset.environment ?? {}),
        },
      },
    },

    transitionPresets: {
      ...defaults.transitionPresets,

      ...(data.transitionPresets ?? {}),
    },

    soundAssets: data.audioAssets ? (data.soundAssets ?? {}) : {
      ...defaults.soundAssets,
      ...(data.soundAssets ?? {}),
    },

    audioAssets: normalizeAudioAssets(data.audioAssets, data.audioAssets ? (data.soundAssets ?? {}) : { ...defaults.soundAssets, ...(data.soundAssets ?? {}) }),

    soundPresets: {
      ...defaults.soundPresets,

      ...(data.soundPresets ?? {}),
    },

    slides: Array.isArray(data.slides) ? data.slides : [],
  };
  // Scene-3Z: convert previously saved Scene.presentation timing into Scene.bgm
  // without changing existing audio settings. Slide-level overrides take priority.
  for (const [name, preset] of Object.entries(normalized.scenePresets)) {
    if (!preset || typeof preset !== "object") continue;
    const presentation = { ...(preset.presentation ?? {}) };
    const bgm = normalizeScenePresetBgm(preset.bgm);
    for (const [oldKey, newKey] of [
      ["bgmFadeInSeconds", "fadeInSeconds"],
      ["bgmFadeOutSeconds", "fadeOutSeconds"],
      ["continueSameTrack", "continueSameTrack"],
    ]) {
      if (bgm[newKey] === undefined && presentation[oldKey] !== undefined) {
        bgm[newKey] = presentation[oldKey];
      }
      delete presentation[oldKey];
    }
    normalized.scenePresets[name] = {
      ...preset,
      // Effects-1H: legacy project-wide effects migrate into each Scene;
      // explicit Scene configurations are never overwritten.
      atmosphereEffects: normalizeAtmosphereEffects(preset.atmosphereEffects ?? data.atmosphereEffects),
      bgm: normalizeScenePresetBgm(bgm),
      presentation,
    };
  }
  return normalized;
};

// ============================================================
// Project Data Resolution
// ============================================================
//
// Project / Preset / Slide Override から、
// 実際に使用する設定値を解決する。
// DOM / Babylon Runtime には依存しない。
// ============================================================

// Scene-1A: Scene settings are the default for a slide; explicit slide preset
// choices continue to take precedence for backward compatibility.
export const getScenePresentationSettings = (projectData, slideState) => {
  const scene = getScenePresetSafe(projectData, slideState?.scenePreset ?? "default");
  return scene?.presentation && typeof scene.presentation === "object" ? scene.presentation : {};
};
export const resolveSceneBgmTiming = (projectData, slideState) => {
  const settings = getScenePresentationSettings(projectData, slideState);
  const scene = getScenePresetBgmOverride(projectData, slideState);
  const slide = normalizeSlideBgmOverride(slideState?.bgmOverride);
  const fallback = DEFAULT_PRESENTATION_BGM_CROSSFADE_SECONDS;
  const clamp = (v) => Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : fallback;
  return {
    fadeInSeconds: clamp(slide.fadeInSeconds ?? scene.fadeInSeconds ?? settings.bgmFadeInSeconds),
    fadeOutSeconds: clamp(slide.fadeOutSeconds ?? scene.fadeOutSeconds ?? settings.bgmFadeOutSeconds),
    continueSameTrack: (slide.continueSameTrack ?? scene.continueSameTrack ?? settings.continueSameTrack) !== false,
  };
};

// Scene-1E: Explicit modes take precedence. Old projects keep their previous
// preset+field-override behavior until a mode is selected in the new editor.
const resolvePresentationLayer = (projectData, slideState, kind) => {
  const sceneSettings = getScenePresentationSettings(projectData, slideState);
  const isTransition = kind === "transition";
  const presets = isTransition ? projectData.transitionPresets : projectData.soundPresets;
  const defaults = isTransition ? {previousSpeed:5,currentSpeed:10,nextSpeed:5} : {previous:"PREVIOUS",current:"CURRENT",next:"NEXT"};
  const sceneMode = sceneSettings[`${kind}Mode`] === "custom" ? "custom" : "preset";
  const sceneName = sceneSettings[`${kind}Preset`] ?? "default";
  const scenePreset = presets?.[sceneName] ?? presets?.default ?? defaults;
  const sceneValue = sceneMode === "custom"
    ? {...scenePreset, ...(sceneSettings[`${kind}Custom`] ?? {})} : {...scenePreset};
  const enabledKey = `${kind}OverrideEnabled`;
  const modeKey = `${kind}OverrideMode`;
  const presetKey = `${kind}Preset`;
  const overrideKey = `${kind}Override`;
  if (slideState?.[enabledKey] === false) return sceneValue;
  if (slideState?.[modeKey] === "preset") {
    const selected = slideState?.[presetKey] ?? "default";
    return {...(presets?.[selected] ?? presets?.default ?? defaults)};
  }
  if (slideState?.[modeKey] === "custom") {
    return {...sceneValue, ...(slideState?.[overrideKey] ?? {})};
  }
  // Legacy projects: explicit slide preset and per-field override were both active.
  const legacyName = slideState?.[presetKey];
  const legacyPreset = legacyName && legacyName !== "default"
    ? (presets?.[legacyName] ?? presets?.default ?? defaults) : sceneValue;
  return {...legacyPreset, ...(slideState?.[overrideKey] ?? {})};
};
export const resolveTransition = (projectData, slideState) =>
  resolvePresentationLayer(projectData ?? createDefaultProjectData(), slideState, "transition");
export const resolveSound = (projectData, slideState) =>
  resolvePresentationLayer(projectData ?? createDefaultProjectData(), slideState, "sound");

export const getScenePresetSafe = function (projectData, presetName) {
  const presets = projectData?.scenePresets;

  if (!presets || typeof presets !== "object") {
    return null;
  }

  const preset = presets[presetName];

  if (preset && typeof preset === "object") {
    return preset;
  }

  return presets.default && typeof presets.default === "object"
    ? presets.default
    : null;
};

export const getScenePresetBgmOverride = function (projectData, slideState) {
  if (!projectData || !slideState) {
    return {};
  }

  const presetName = slideState.scenePreset ?? "default";

  const preset = getScenePresetSafe(projectData, presetName);

  return normalizeScenePresetBgm(preset?.bgm);
};

/**
 * Move only completely inherited legacy Project BGM configurations into
 * Scene presets. Explicit Scene overrides remain untouched. This is an
 * opt-in in-memory mutation; the editor owns Undo/Redo and persistence.
 * The legacy Project BGM is deliberately retained.
 */
export const copyInheritedProjectBgmToScenes = function (projectData) {
  if (!projectData || !projectData.scenePresets) return 0;
  const projectBgm = normalizeProjectBgm(projectData.bgm);
  let copied = 0;
  for (const scene of Object.values(projectData.scenePresets)) {
    if (!scene || typeof scene !== "object") continue;
    if (Object.keys(normalizeScenePresetBgm(scene.bgm)).length) continue;
    scene.bgm = normalizeScenePresetBgm({
      enabled: projectBgm.enabled,
      soundId: projectBgm.soundId || "NONE",
      volume: projectBgm.volume,
      loop: projectBgm.loop,
    });
    copied++;
  }
  return copied;
};

/**
 * Opt-in finalization of legacy Project BGM. Complete every Scene's BGM
 * using the currently effective Project→Scene values before switching the
 * resolver to Scene→Slide. The legacy project.bgm is preserved for undo and
 * compatibility, but is no longer consulted in scene mode.
 * Returns the number of presets populated. Idempotent.
 */
export const finalizeSceneBgmMigration = function (projectData) {
  if (!projectData || !projectData.scenePresets || projectData.bgmSourceMode === "scene") return 0;
  const projectBgm = normalizeProjectBgm(projectData.bgm);
  let count = 0;
  for (const preset of Object.values(projectData.scenePresets)) {
    if (!preset || typeof preset !== "object") continue;
    const prior = normalizeScenePresetBgm(preset.bgm);
    const complete = normalizeProjectBgm({ ...projectBgm, ...prior });
    // A full Scene config cannot refer to the legacy Project sound implicitly.
    preset.bgm = {
      enabled: complete.enabled,
      soundId: complete.soundId || "NONE",
      volume: complete.volume,
      loop: complete.loop,
    };
    const presentation = preset.presentation && typeof preset.presentation === "object"
      ? preset.presentation : {};
    preset.presentation = {
      ...presentation,
      bgmFadeInSeconds: Number.isFinite(presentation.bgmFadeInSeconds)
        ? presentation.bgmFadeInSeconds : projectBgm.fadeSeconds,
      bgmFadeOutSeconds: Number.isFinite(presentation.bgmFadeOutSeconds)
        ? presentation.bgmFadeOutSeconds : projectBgm.fadeSeconds,
    };
    count++;
  }
  projectData.bgmSourceMode = "scene";
  return count;
};

export const resolveScenePresetBgm = function (_projectData, scenePreset) {
  return normalizeProjectBgm(normalizeScenePresetBgm(scenePreset?.bgm));
};

// Resolve Project / ScenePreset / Slide BGM overrides.
export const resolveBgm = function (projectData, slideState) {
  const sceneBgm = getScenePresetBgmOverride(projectData, slideState);
  const slideOverride = normalizeSlideBgmOverride(slideState?.bgmOverride);
  return normalizeProjectBgm({ ...sceneBgm, ...slideOverride });
};
