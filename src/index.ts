import { ButtonController } from "./controller/ButtonController";
import { Settings } from "./settings/Settings";

(async function () {
  let settings = new Settings();

  // Initialize buttons on initial load
  ButtonController.initializeButtons(settings.config);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (
              node.matches(".SceneCard, .card-header") ||
              node.querySelector(".SceneCard, .card-header")
            ) {
              // Re-initializes when there are new SceneCards or Card Headers
              ButtonController.initializeButtons(settings.config);
            }
          }
        });
      }
    }
  });

  const observerConfig = { childList: true, subtree: true };
  observer.observe(document.body, observerConfig);

  // Initialize the menu
  await GM_registerMenuCommand("Settings", settings.openSettingsModal);
})();
