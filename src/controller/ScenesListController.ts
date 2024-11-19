import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { render } from 'solid-js/web';
import BulkActionButton from '../components/BulkActionButton';

export class ScenesListController {
  static initialize(config: Config) {
    if (config.whisparrApiKey) {
      const sceneListCommandRow = document.querySelector<HTMLDivElement>(
        '.scenes-list > div.flex-wrap',
      );
      const addAllAvailableButton = document.querySelector(
        Stasharr.DOMSelector.AddAllAvailable,
      );

      const searchAllAvailableButton = document.querySelector(
        Stasharr.DOMSelector.SearchAllExisting,
      );
      if (sceneListCommandRow) {
        if (!addAllAvailableButton) {
          render(
            () => BulkActionButton({ config: config, actionType: 'add' }),
            sceneListCommandRow,
          );
        }
        if (!searchAllAvailableButton) {
          render(
            () => BulkActionButton({ config: config, actionType: 'search' }),
            sceneListCommandRow,
          );
        }
      }
    }
  }
}
