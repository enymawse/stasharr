import { CardController } from './controller/CardController';
import { PerformerController } from './controller/PerformerController';
import { NavbarController } from './controller/NavbarController';
import { ScenesListController } from './controller/ScenesListController';
import { StudioController } from './controller/StudioController';

import './styles/main.scss';
import { Config } from './models/Config';
import { DetailsController } from './controller/scene/DetailsController';

(async function () {
  const config = new Config().load();
  new NavbarController(config);
  new PerformerController(config);
  new StudioController(config);
  new ScenesListController(config);
  new CardController(config);
  new DetailsController(config);
})();
