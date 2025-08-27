import { CardController } from './controller/CardController';
import { PerformerController } from './controller/PerformerController';
import { NavbarController } from './controller/NavbarController';
import { ScenesListController } from './controller/ScenesListController';
import { StudioController } from './controller/StudioController';
import { TooltipManager } from './service/TooltipManager';

import './styles/main.scss';
import { Config } from './models/Config';
import { DetailsController } from './controller/scene/DetailsController';

(async function () {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // Initialize tooltip management system
  TooltipManager.initialize();

  const config = new Config().load();
  new NavbarController(config);
  new PerformerController(config);
  new StudioController(config);
  new ScenesListController(config);
  new CardController(config);
  new DetailsController(config);
})();
