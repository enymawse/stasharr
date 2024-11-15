import { ButtonController } from "./controller/ButtonController";
import { PerformerController } from "./controller/PerformerController";
import { NavbarController } from "./controller/NavbarController";
import { ScenesListController } from "./controller/ScenesListController";
import { StudioController } from "./controller/StudioController";
import { StashDB } from "./enums/StashDB";
import { Settings } from "./settings/Settings";
import {
  shouldButtonsInit,
  shouldPerformerInit,
  shouldScenesListInit,
  shouldStudioInit,
} from "./util/util";

(async function () {
  const settings = new Settings();

  // Initialize on initial load
  ButtonController.initializeButtons(settings.config);
  // StudioSummaryController.initialize(settings.config);
  ScenesListController.initialize(settings.config);
  const navbarController = new NavbarController(document.body);

  const observer = new MutationObserver((mutationsList) => {
    const path: string[] = window.location.pathname.split("/");
    const module: string | null = path.length > 1 ? path[1] : null;
    const stashId: string | null = path.length > 2 ? path[2] : null;

    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            observer.disconnect();
            if (shouldButtonsInit(node)) {
              ButtonController.initializeButtons(settings.config);
            }
            if (shouldStudioInit(node)) {
              StudioController.initialize(settings.config);
            }
            if (shouldScenesListInit(node)) {
              ScenesListController.initialize(settings.config);
            }
            if (shouldPerformerInit(node)) {
              PerformerController.initialize(settings.config);
            }
            observer.observe(document.body, observerConfig);
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
