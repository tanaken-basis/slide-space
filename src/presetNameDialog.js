import {t} from './i18n.js';

export function requestPresetName({initialName, normalize, isAvailable, title = 'Rename Scene Preset'}, doc = document) {
  const dialog = doc.getElementById('presetNameDialog');
  if (dialog.open) return Promise.resolve(null);
  const heading = doc.getElementById('presetNameTitle');
  if (heading) { heading.textContent = t(title); heading.setAttribute('data-i18n', title); }
  const form = doc.getElementById('presetNameForm');
  const input = doc.getElementById('presetNameInput');
  const error = doc.getElementById('presetNameError');
  const cancel = doc.getElementById('presetNameCancel');
  input.value = initialName;
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  return new Promise(resolve => {
    let result = null;
    const finish = () => dialog.close();
    const submit = event => {
      event.preventDefault();
      const name = normalize(input.value);
      const message = !name ? 'Enter a preset name.' : !isAvailable(name) ? 'That preset name already exists.' : '';
      error.textContent = t(message);
      input.setAttribute('aria-invalid', String(Boolean(message)));
      if (message) {input.focus();return;}
      result = name;
      finish();
    };
    const clearError = () => {error.textContent = ''; input.removeAttribute('aria-invalid');};
    // Keep typing and shortcuts inside the dialog, away from camera/history shortcuts.
    const stop = event => event.stopPropagation();
    const close = () => {
      form.removeEventListener('submit', submit);
      input.removeEventListener('input', clearError);
      cancel.removeEventListener('click', finish);
      dialog.removeEventListener('keydown', stop);
      dialog.removeEventListener('keyup', stop);
      dialog.removeEventListener('close', close);
      resolve(result);
    };
    form.addEventListener('submit', submit);
    input.addEventListener('input', clearError);
    cancel.addEventListener('click', finish);
    dialog.addEventListener('keydown', stop);
    dialog.addEventListener('keyup', stop);
    dialog.addEventListener('close', close);
    dialog.showModal();
    input.focus();input.select();
  });
}
