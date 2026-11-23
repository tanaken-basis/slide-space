/**
 * Bind a numeric editor to explicit commit/cancel semantics.
 *
 * commit() returns true for an accepted value (including an unchanged one),
 * false for an invalid/incomplete value. The owner is responsible for
 * validation, updating model state, and editor history.
 * restore() re-renders the authoritative model value into the input.
 *
 * Enter commits once and then blurs. Escape restores without committing.
 * Ordinary blur commits once. A disabled input never commits.
 * Returns an unsubscribe callback for future dynamic panels.
 */
export function bindNumericCommitInput(input, { commit, restore }) {
  if (!input) return () => {};
  if (typeof commit !== "function" || typeof restore !== "function") {
    throw new TypeError("bindNumericCommitInput requires commit and restore functions");
  }

  // The blur triggered by Enter/Escape must not replay an edit.
  let skipNextBlur = false;

  const attemptCommit = () => {
    if (input.disabled) return;
    if (commit() === false) restore();
  };

  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      skipNextBlur = true;
      restore();
      input.blur();
    } else if (event.key === "Enter") {
      event.preventDefault();
      skipNextBlur = true;
      attemptCommit();
      input.blur();
    }
  };

  const onBlur = () => {
    if (skipNextBlur) {
      skipNextBlur = false;
      return;
    }
    attemptCommit();
  };

  input.addEventListener("keydown", onKeydown);
  input.addEventListener("blur", onBlur);
  return () => {
    input.removeEventListener("keydown", onKeydown);
    input.removeEventListener("blur", onBlur);
  };
}
