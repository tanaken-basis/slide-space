/**
 * DOM-only controller for the slide context menu.
 * Selection logic and command execution remain in the application layer.
 */
export function createSlideContextMenuController({
  menu,
  isValidSlideIndex,
  getCommandDisabled,
}) {
  let slideIndex = null;

  function close() {
    if (!menu) return;
    menu.hidden = true;
    slideIndex = null;
  }

  function refresh() {
    if (!menu) return;
    const disabled = getCommandDisabled(slideIndex);
    for (const button of menu.querySelectorAll("[data-slide-command]")) {
      const command = button.dataset.slideCommand;
      // Unknown commands remain unchanged, matching the previous behavior.
      if (Object.hasOwn(disabled, command)) {
        button.disabled = disabled[command];
      }
    }
  }

  function open(clientX, clientY, index) {
    if (!menu || !isValidSlideIndex(index)) return;
    slideIndex = index;
    menu.hidden = false;
    menu.style.left = "0px";
    menu.style.top = "0px";

    const rect = menu.getBoundingClientRect();
    const margin = 8;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    const x = Math.max(margin, Math.min(clientX, maxX));
    const y = Math.max(margin, Math.min(clientY, maxY));
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    refresh();
  }

  function bindCommands({ onCommand }) {
    if (!menu) return;
    menu.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-slide-command]");
      if (!button || !menu.contains(button) || button.disabled) return;
      await onCommand(button.dataset.slideCommand, slideIndex);
    });
  }

  // Event registrations are owned by the controller, rather than main.js.
  window.addEventListener("pointerdown", (event) => {
    if (!menu || menu.hidden || menu.contains(event.target)) return;
    close();
  });
  window.addEventListener("scroll", close, true);

  return { open, close, bindCommands };
}
