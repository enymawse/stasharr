import { StashDB } from '../enums/StashDB';
import { Config } from '../models/Config';
import { extractStashIdFromPath } from '../util/util';
import Performer from '../components/Performer';
import { render } from 'solid-js/web';

export class PerformerController {
  static initialize(config: Config) {
    const performerStashId = extractStashIdFromPath();
    if (config.whisparrApiKey == '' || performerStashId == null) return;

    const performerTitle = document.querySelector(
      StashDB.DOMSelector.PerformerCardHeader,
    );

    if (performerTitle) {
      render(
        () => Performer({ config: config, stashId: performerStashId }),
        performerTitle,
      );
    }
  }
}
