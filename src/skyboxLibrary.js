// Camera-2C: project-scoped Skybox Library data model.
// This layer intentionally leaves legacy environment.skybox (six face paths)
// intact. Registration does not modify the scene or slide's active skybox.
export const SKYBOX_FACES = Object.freeze(['px', 'py', 'pz', 'nx', 'ny', 'nz']);

export function normalizeSkyboxFaces(value) {
  if (!value || typeof value !== 'object') return null;
  const result = {};
  for (const face of SKYBOX_FACES) {
    const path = value[face];
    if (typeof path !== 'string' || !path.trim()) return null;
    result[face] = path.trim();
  }
  return result;
}

export function sameSkyboxFaces(a, b) {
  const lhs = normalizeSkyboxFaces(a);
  const rhs = normalizeSkyboxFaces(b);
  return Boolean(lhs && rhs && SKYBOX_FACES.every(face => lhs[face] === rhs[face]));
}

export function normalizeSkyboxLibrary(value) {
  if (!Array.isArray(value)) return [];
  const used = new Set();
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const skybox = normalizeSkyboxFaces(entry.skybox);
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id || used.has(id) || !skybox) return [];
    used.add(id);
    return [{id, name: String(entry.name || id), skybox, registered: entry.registered !== false}];
  });
}

export function registerSkyboxSet(library, {id, name, skybox}) {
  const list = normalizeSkyboxLibrary(library);
  const faces = normalizeSkyboxFaces(skybox);
  const key = typeof id === 'string' ? id.trim() : '';
  if (!key || !faces) throw new Error('Skybox registration requires an ID and six valid face paths');
  const duplicate = list.find(item => item.id === key);
  if (duplicate && !sameSkyboxFaces(duplicate.skybox, faces)) {
    throw new Error('Skybox ID already belongs to a different six-face set');
  }
  const entry = {id:key, name:String(name || key), skybox:faces, registered:true};
  return duplicate ? list.map(item => item.id === key ? entry : item) : [...list,entry];
}

export function unregisterSkyboxSet(library, id) {
  // Keep paths so historical assignments can continue to render, and
  // re-registration can restore the entry without rebuilding the identity.
  return normalizeSkyboxLibrary(library).map(item => item.id === id ? {...item,registered:false} : item);
}

// Update only the display name. Keep the six original paths and identity intact.
export function renameSkyboxSet(library, id, name) {
  const label = typeof name === 'string' ? name.trim() : '';
  if (!label) throw new Error('Skybox display name cannot be empty');
  return normalizeSkyboxLibrary(library).map(item =>
    item.id === id ? {...item, name:label} : item
  );
}

// Camera-2E: editor choices are library identities, while legacy active faces
// remain available even if their registration has been removed.
export function skyboxEditorChoices(library, activeFaces) {
  const registered = normalizeSkyboxLibrary(library).filter(item => item.registered);
  const choices = registered.map(item => ({value:`library:${item.id}`, name:item.name, skybox:item.skybox, legacy:false}));
  if (normalizeSkyboxFaces(activeFaces) && !registered.some(item => sameSkyboxFaces(item.skybox, activeFaces))) {
    choices.push({value:'legacy-current', name:'', skybox:normalizeSkyboxFaces(activeFaces), legacy:true});
  }
  return choices;
}

export function skyboxEditorSelectedValue(choices, activeFaces) {
  return choices.find(item => sameSkyboxFaces(item.skybox, activeFaces))?.value || '';
}

// Compare registered face paths with a successful scan of skybox/.
// `null` means the directory has not been scanned or could not be read.
export function missingSkyboxFiles(skybox, filenames) {
  if (!Array.isArray(filenames)) return [];
  const faces = normalizeSkyboxFaces(skybox);
  if (!faces) return [...SKYBOX_FACES];
  const available = new Set(filenames.map(name => name.toLowerCase()));
  return SKYBOX_FACES.filter(face => {
    const path = faces[face].replaceAll('\\', '/');
    const name = path.split('/').at(-1)?.toLowerCase();
    return !name || !available.has(name);
  });
}
