import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { render } from 'solid-js/web';
import BulkActionButton from '../components/BulkActionButton';
import { BaseController } from './BaseController';
import { SceneListMutationHandler } from '../mutation-handlers/SceneListMutationHandler';

export class ScenesListController extends BaseController {
  constructor(private _config: Config) {
    super(new SceneListMutationHandler());
  }

  shouldReinit(node: HTMLElement): boolean {
    return node.matches('.row');
  }

  initialize() {
    if (this._config.whisparrApiKey) {
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
            () => BulkActionButton({ config: this._config, actionType: 'add' }),
            sceneListCommandRow,
          );
        }
        if (!searchAllAvailableButton) {
          render(
            () =>
              BulkActionButton({ config: this._config, actionType: 'search' }),
            sceneListCommandRow,
          );
        }
      }
    }
  }
}
