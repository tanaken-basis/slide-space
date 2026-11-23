import {t} from './i18n.js';
import {requestPresetName} from './presetNameDialog.js';
import {bindNumericCommitInput} from './numericCommitController.js';
import {uiSound} from './uiSound.js';

// The app owns transactions and runtime refresh; this view edits plain preset data.
// Keep shared-preset references consistent when a preset is renamed or removed.
// Scene settings and slide-level explicit choices both refer to the same library.
export function replacePresetReferences({ project, slides, kind, oldName, newName }) {
  const field = kind === 'transitionPresets' ? 'transitionPreset' : 'soundPreset';
  for (const slide of slides ?? []) {
    if (slide?.[field] === oldName) slide[field] = newName;
  }
  for (const scene of Object.values(project?.scenePresets ?? {})) {
    if (scene?.presentation?.[field] === oldName) {
      scene.presentation[field] = newName;
    }
  }
}

export function initializePresetSettingsEditor({readProject, readSlides, begin, finish, refresh, soundIds}) {
  const container = document.getElementById('projectPresetEditors');
  if (!container) return;
  const views = [];
  const selections = {};
  for (const [kind, field, title, defaults] of [
    ['transitionPresets', 'transitionPreset', 'Transition Presets', {previousSpeed:5,currentSpeed:10,nextSpeed:5,previousDuration:2,currentDuration:2,nextDuration:2}],
    ['soundPresets', 'soundPreset', 'Sound Presets', {previous:'NONE',current:'NONE',next:'NONE'}],
  ]) {
    const section = document.createElement('details'); section.className = 'inspector-section preset-library-kind';
    const heading = document.createElement('summary'); heading.dataset.i18n = title; heading.textContent = t(title);
    const body = document.createElement('div'); body.className = 'inspector-section-content';
    const select = document.createElement('select'); select.setAttribute('aria-label', t(title));
    const fields = document.createElement('div'); fields.className = 'preset-settings-fields';
    const actions = document.createElement('div'); actions.className = 'project-file-actions';
    let selected = 'default';
    const mutate = action => {
      const project = readProject(); if (!project) return;
      const edit = begin(); if (!edit) return;
      action(project); finish(edit); refresh(); render();
    };
    const button = (label, action) => {
      const element = document.createElement('button'); element.type = 'button';
      element.textContent = t(label); element.dataset.i18n = label;
      element.addEventListener('click', async () => { void uiSound.play(); await action(); });
      actions.append(element); return element;
    };
    async function nameFor(initial) {
      const project = readProject();
      const name = await requestPresetName({title:'Preset name', initialName:initial, normalize:value=>value.trim(), isAvailable:value=> !['__proto__','prototype','constructor'].includes(value) && !Object.hasOwn(project?.[kind] ?? {}, value)});
      return project === readProject() ? name : null;
    }
    button('Add preset', async () => {
      const name = await nameFor('preset'); if (!name) return;
      mutate(project => { project[kind] ??= {}; project[kind][name] = structuredClone(defaults); selected = name; });
    });
    button('Duplicate preset', async () => {
      const project = readProject(); const source = selected;
      const name = await nameFor(source + '-copy'); if (!name || !project?.[kind]?.[source]) return;
      mutate(project => { project[kind][name] = structuredClone(project[kind][source]); selected = name; });
    });
    const rename = button('Rename preset', async () => {
      if (selected === 'default') return;
      const old = selected; const name = await nameFor(old); if (!name) return;
      mutate(project => {
        project[kind][name] = project[kind][old]; delete project[kind][old];
        replacePresetReferences({project, slides:readSlides(), kind, oldName:old, newName:name});
        selected = name;
      });
    });
    const remove = button('Delete preset', () => {
      if (selected === 'default' || !window.confirm(t('Delete this preset? Scenes and Slides using it will use default.'))) return;
      mutate(project => {
        replacePresetReferences({project, slides:readSlides(), kind, oldName:selected, newName:'default'});
        delete project[kind][selected]; selected = 'default';
      });
    });
    const inputs = [];
    let timingModeSelect = null;
    if(kind === 'transitionPresets') {
      const label = document.createElement('label');
      const caption = document.createElement('span'); caption.dataset.i18n='Transition timing'; caption.textContent=t('Transition timing');
      timingModeSelect=document.createElement('select');
      for(const mode of ['speed','duration']) {const option=new Option(t(mode === 'speed' ? 'Speed' : 'Duration'),mode); option.dataset.i18n=mode === 'speed' ? 'Speed' : 'Duration'; timingModeSelect.add(option);}
      timingModeSelect.addEventListener('change',()=>mutate(project=>{project.transitionPresets[selected].mode=timingModeSelect.value;}));
      label.append(caption,timingModeSelect); fields.append(label);
    }
    for (const [key, fallback] of Object.entries(defaults)) {
      const label = document.createElement('label');
      const caption = document.createElement('span'); caption.dataset.i18n = key; caption.textContent = t(key);
      const input = document.createElement(kind === 'soundPresets' ? 'select' : 'input');
      input.setAttribute('aria-label', t(key));
      if (kind === 'transitionPresets') {
        input.type = 'number'; input.min = '0'; input.max = key.endsWith('Duration') ? '120' : '100'; input.step = '0.01';
        bindNumericCommitInput(input, {
          commit: () => {
            const value = input.valueAsNumber;
            if (!Number.isFinite(value) || value < 0 || value > (key.endsWith('Duration') ? 120 : 100)) return false;
            mutate(project => { project[kind][selected][key] = value; }); return true;
          }, restore: () => render(),
        });
      } else input.addEventListener('change', () => mutate(project => { project[kind][selected][key] = input.value; }));
      label.append(caption,input); fields.append(label); inputs.push({input,key,fallback,label});
    }
    function render() {
      const presets = readProject()?.[kind] ?? {};
      if (!Object.hasOwn(presets, selected)) selected = 'default';
      select.replaceChildren(...Object.keys(presets).map(name => new Option(name,name)));
      select.value = selected;
      rename.disabled = remove.disabled = selected === 'default';
      const timingMode = presets[selected]?.mode === 'duration' ? 'duration' : 'speed';
      if(timingModeSelect) {timingModeSelect.value=timingMode;timingModeSelect.disabled=!presets[selected];}
      for (const {input,key,fallback,label} of inputs) {
        if(kind === 'transitionPresets') label.hidden=key.endsWith('Duration') ? timingMode !== 'duration' : timingMode === 'duration';
        const value = presets[selected]?.[key] ?? fallback;
        if (kind === 'soundPresets') input.replaceChildren(...[...new Set(['NONE',...soundIds(),value])].map(id => new Option(id,id)));
        input.value = String(value); input.disabled = !presets[selected];
      }
    }
    select.addEventListener('change',()=> {selected = select.value;render();});
    body.append(select,actions,fields); section.append(heading,body); container.append(section);
    views.push(render);
    selections[kind] = {read: () => selected, restore: value => { selected = value; }};
  }
  const refreshViews = () => views.forEach(render => render());
  refreshViews.readSelection = () => Object.fromEntries(Object.entries(selections).map(([kind, view]) => [kind, view.read()]));
  refreshViews.restoreSelection = state => {
    for (const [kind, value] of Object.entries(state ?? {})) selections[kind]?.restore(value);
  };
  return refreshViews;
}
