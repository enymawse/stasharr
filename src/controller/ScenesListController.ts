import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { render } from 'solid-js/web';
import { BaseController } from './BaseController';
import { SceneListMutationHandler } from '../mutation-handlers/SceneListMutationHandler';
import SceneList from '../components/SceneList';

export class ScenesListController extends BaseController {
  constructor(private _config: Config) {
    super(new SceneListMutationHandler());
  }

  shouldReinit(node: HTMLElement): boolean {
    return node.matches('.row');
  }

  initialize() {
    if (this._config.whisparrApiKey) {
      const sceneListCommandRow =
        document.querySelector<HTMLDivElement>('.scenes-list');
      const addAllAvailableButton = document.querySelector(
        Stasharr.DOMSelector.AddAllAvailable,
      );

      const searchAllAvailableButton = document.querySelector(
        Stasharr.DOMSelector.SearchAllExisting,
      );

      const placeholder = document.createElement('div');

      if (sceneListCommandRow) {
        if (!addAllAvailableButton && !searchAllAvailableButton) {
          sceneListCommandRow.insertBefore(
            placeholder,
            sceneListCommandRow.firstChild,
          );
          render(() => SceneList({ config: this._config }), placeholder);
        }
      }
    }
  }
}
