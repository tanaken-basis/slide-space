/**
 * Bind an <input type="range"> to a preview/commit transaction.
 *
 * The host owns the canonical value, scene updates, and Undo/Redo. In particular,
 * preview(value) MUST NOT register history; commit(before, after) should register
 * exactly one undoable command. `read()` returns the canonical starting value.
 *
 * Pointer drag: many input previews -> one pointerup commit.
 * Keyboard: a run of arrow/page/home/end keys -> one keyup commit.
 * change/blur: fallback finalization (not a second history entry).
 * Escape: restore the initial value without recording history.
 * Returns an unbind function; unbind cancels an unfinished gesture.
 */
export function bindSliderCommitInput(input, { read, preview, commit, cancel: restore, equal = Object.is }) {
  if (!input) return () => {};
  if ([read, preview, commit, equal].some(fn => typeof fn !== 'function')) {
    throw new TypeError('bindSliderCommitInput requires read, preview, commit and equal functions');
  }
  let startValue;
  let active = false;
  let dragging = false;
  let keyboard = false;

  function begin() {
    if (active || input.disabled) return;
    startValue = read();
    active = true;
  }
  function current() {
    return Number(input.value);
  }
  function update() {
    if (input.disabled) return;
    begin();
    const next = current();
    if (Number.isFinite(next)) preview(next);
  }
  function finish() {
    if (!active) return;
    const before = startValue;
    active = false;
    dragging = false;
    keyboard = false;
    const after = current();
    if (!input.disabled && Number.isFinite(after) && !equal(before, after)) {
      commit(before, after);
    } else if (restore) {
      restore();
    }
  }
  function cancel() {
    if (!active) return;
    const initial = startValue;
    active = false;
    dragging = false;
    keyboard = false;
    input.value = String(initial);
    if (restore) restore();
    else preview(initial);
  }
  const onPointerDown = event => {
    if (!input.disabled) {
      begin(); dragging = true;
      if (event.pointerId != null) input.setPointerCapture?.(event.pointerId);
    }
  };
  const onInput = () => update();
  const onPointerUp = () => { if (dragging) finish(); };
  const onKeyDown = event => {
    if ((event.ctrlKey || event.metaKey) && /^[zy]$/i.test(event.key)) finish();
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation?.(); // Do not let global Escape change slide selection.
      if (active) cancel();
      else input.blur?.(); // Escape after a completed drag releases keyboard focus.
      return;
    }
    if (/^(Arrow(Left|Right|Up|Down)|PageUp|PageDown|Home|End)$/.test(event.key) && !input.disabled) {
      begin(); keyboard = true;
    }
  };
  const onKeyUp = event => {
    if (keyboard && /^(Arrow(Left|Right|Up|Down)|PageUp|PageDown|Home|End)$/.test(event.key)) finish();
  };
  const onChange = () => { if (active) finish(); };
  const onBlur = () => { if (active) finish(); };
  const handlers = [
    ['pointerdown', onPointerDown], ['input', onInput],
    ['pointerup', onPointerUp], ['pointercancel', cancel],
    ['keydown', onKeyDown], ['keyup', onKeyUp],
    ['change', onChange], ['blur', onBlur],
  ];
  for (const [name, fn] of handlers) input.addEventListener(name, fn);
  return () => {
    cancel();
    for (const [name, fn] of handlers) input.removeEventListener(name, fn);
  };
}
