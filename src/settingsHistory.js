// Serializable settings only. Babylon objects never enter this history.
export const projectSettingKeys = ['scenePresets', 'transitionPresets', 'soundPresets', 'audioAssets', 'soundAssets'];
export const slideSettingKeys = ['scenePreset', 'transitionPreset', 'soundPreset', 'environmentOverride', 'transitionOverride', 'soundOverride', 'transitionOverrideMode', 'soundOverrideMode', 'bgmOverride', 'autoPlayOverride', 'interaction', 'action'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => structuredClone(value);
export function captureSettings(project, slides, presentation) {
  const pick = (object, keys) => Object.fromEntries(keys.filter(key => own(object, key)).map(key => [key, copy(object[key])]));
  return {
    project: pick(project, projectSettingKeys),
    presentation: copy(presentation),
    slides: Object.fromEntries(slides.map(slide => [slide.id, pick(slide, slideSettingKeys)])),
  };
}
export function diffSettings(before, after, path = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (record(before) && record(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
      if (own(before, key) && own(after, key)) return diffSettings(before[key], after[key], [...path, key]);
      return [{path: [...path, key], before: {exists: own(before, key), value: copy(before[key])}, after: {exists: own(after, key), value: copy(after[key])}}];
    });
  }
  return [{path, before: {exists: true, value: copy(before)}, after: {exists: true, value: copy(after)}}];
}
export function applySettingsPatch(target, changes, phase) {
  // Preflight all parents, so a stale reference cannot partially replay a command.
  const writes = changes.map(change => {
    let parent = target;
    for (const key of change.path.slice(0, -1)) {
      if (!parent || !own(parent, key)) throw new Error('Missing history target: ' + change.path.join('/'));
      parent = parent[key];
    }
    return {parent, key: change.path.at(-1), state: change[phase]};
  });
  for (const {parent, key, state} of writes) {
    if (state.exists) Object.defineProperty(parent, key, {value: copy(state.value), writable: true, configurable: true, enumerable: true});
    else delete parent[key];
  }
}
