import { Config } from '../models/Config';
import { extractStashIdFromSceneCard } from '../util/util';
import { Stasharr } from '../enums/Stasharr';
import { StashDB } from '../enums/StashDB';
import { render } from 'solid-js/web';
import { BaseController } from './BaseController';
import { ButtonMutationHandler } from '../mutation-handlers/ButtonMutationHandler';
import CardButton from '../components/scene/card/CardButton';

export class CardController extends BaseController {
  constructor(private _config: Config) {
    super(new ButtonMutationHandler());
  }

  shouldReinit(): boolean {
    let sceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardWithNoStatus(),
    );
    if (sceneCards.length > 0) {
      return true;
    }
    return false;
  }

  initialize() {
    if (this._config.whisparrApiKey == '') return;
    const sceneCards = document.querySelectorAll<HTMLElement>(
      StashDB.DOMSelector.SceneCard,
    );
    sceneCards.forEach((sceneCard) => {
      const stashId = extractStashIdFromSceneCard(sceneCard);
      if (stashId) {
        if (!sceneCard.querySelector(Stasharr.DOMSelector.CardButton)) {
          render(
            () =>
              CardButton({
                config: this._config,
                stashId: stashId,
              }),
            sceneCard,
          );
        }
      }
    });
  }
}
