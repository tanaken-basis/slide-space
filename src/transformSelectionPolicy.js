/** Scene-4G: pure Active Object focus policy used by Transform workspace. */
export function chooseFocusedTransformTarget({options = [], previous = '', preferred = '', keepPrevious = false} = {}) {
  const valid = new Set(options);
  // An explicitly focused item stays focused while it is still selected.
  if (keepPrevious && valid.has(previous)) return previous;
  if (valid.has(preferred)) return preferred;
  if (valid.has(previous)) return previous;
  return options[0] ?? '';
}
