import { ButtonController } from './controller/ButtonController';
import { PerformerController } from './controller/PerformerController';
import { NavbarController } from './controller/NavbarController';
import { ScenesListController } from './controller/ScenesListController';
import { StudioController } from './controller/StudioController';
import { Settings } from './settings/Settings';
import {
  shouldButtonsInit,
  shouldPerformerInit,
  shouldScenesListInit,
  shouldStudioInit,
} from './util/util';

(async function () {
  const settings = new Settings();

  // Initialize on initial load
  ButtonController.initializeButtons(settings.config);
  // StudioSummaryController.initialize(settings.config);
  ScenesListController.initialize(settings.config);
  new NavbarController(document.body);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
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

  /* eslint no-undef: off */
  await GM_registerMenuCommand('Settings', settings.openSettingsModal);
})();
