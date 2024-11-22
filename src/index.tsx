import { ButtonController } from './controller/ButtonController';
import { PerformerController } from './controller/PerformerController';
import { NavbarController } from './controller/NavbarController';
import { ScenesListController } from './controller/ScenesListController';
import { StudioController } from './controller/StudioController';

import './styles/main.scss';
import { Config } from './models/Config';

(async function () {
  const config = new Config().load();
  new NavbarController(config);
  new PerformerController(config);
  new StudioController(config);
  new ScenesListController(config);
  new ButtonController(config);
})();
