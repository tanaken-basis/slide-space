import {createDefaultProjectData} from "./projectData.js";

/** Create an isolated project under a user-approved parent directory.
 * Never reuses an existing folder; avoids accidentally replacing project.json.
 */
export function validateNewProjectName(value) {
  const name = String(value ?? '').trim();
  if (!name || name === '.' || name === '..' || /[\\/<>:"|?*\u0000-\u001f]/u.test(name) || /[. ]$/u.test(name) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu.test(name)) return null;
  return name;
}

export async function createProjectDirectory(parent, rawName, initialData) {
  const name = validateNewProjectName(rawName);
  if (!name) throw new Error('INVALID_PROJECT_NAME');
  try {
    await parent.getDirectoryHandle(name, {create: false});
    throw new Error('PROJECT_DIRECTORY_EXISTS');
  } catch (error) {
    if (error?.message === 'PROJECT_DIRECTORY_EXISTS') throw error;
    if (error?.name !== 'NotFoundError') throw error;
  }
  const directory = await parent.getDirectoryHandle(name, {create: true});
  const sound = await directory.getDirectoryHandle('sound', {create: true});
  await sound.getDirectoryHandle('sfx', {create: true});
  await sound.getDirectoryHandle('bgm', {create: true});
  await directory.getDirectoryHandle('slides', {create: true});
  await directory.getDirectoryHandle('assets', {create: true});
  await directory.getDirectoryHandle('skybox', {create: true});
  await directory.getDirectoryHandle('web', {create: true});
  const file = await directory.getFileHandle('project.json', {create: true});
  const writable = await file.createWritable();
  try { await writable.write(JSON.stringify({...initialData, name}, null, 2)); }
  finally { await writable.close(); }
  return directory;
}

/** Clean Scene-based audio defaults for a *new* project only.
 * Existing project normalization remains backward compatible.
 */
export function createFreshProjectData() {
  const project = createDefaultProjectData();
  project.bgmSourceMode = 'scene';
  project.soundPresets = {default: {previous: 'NONE', current: 'NONE', next: 'NONE'}};
  project.audioAssets = {};
  // Legacy soundAssets is intentionally omitted from new project.json.
  delete project.soundAssets;
  project.assetLibrary = [];
  return project;
}
