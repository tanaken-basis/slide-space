// Visit audio references only: user labels, preset names and asset paths are not IDs.
export function visitProjectAudioReferences(project, slides, visit) {
  const field = (object, key) => { if (object && typeof object[key] === 'string') visit(object, key); };
  const sound = object => { for (const key of ['previous', 'current', 'next']) field(object,key); };
  field(project.bgm, 'soundId');
  for (const preset of Object.values(project.scenePresets ?? {})) field(preset.bgm, 'soundId');
  for (const preset of Object.values(project.soundPresets ?? {})) sound(preset);
  for (const slide of slides) { field(slide.bgmOverride, 'soundId'); sound(slide.soundOverride); }
}
export function countProjectAudioReferences(project, slides, id) {
  let count = 0;
  visitProjectAudioReferences(project, slides, (object,key) => { if (object[key] === id) count++; });
  return count;
}
export function renameProjectAudioReferences(project, slides, from, to) {
  visitProjectAudioReferences(project, slides, (object,key) => { if (object[key] === from) object[key] = to; });
}
