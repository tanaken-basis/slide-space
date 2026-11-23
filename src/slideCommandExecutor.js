/**
 * Central dispatch for slide commands, independent from menus and toolbars.
 * Individual actions are provided by main.js to keep application state there.
 */
export function createSlideCommandExecutor(actions) {
  return async function executeSlideCommand(command) {
    if (!Object.hasOwn(actions, command) || typeof actions[command] !== "function") {
      console.warn("Unknown slide command:", command);
      return false;
    }
    await actions[command]();
    return true;
  };
}
