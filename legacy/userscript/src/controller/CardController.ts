import { Config } from '../models/Config';
import { extractStashIdFromSceneCard } from '../util/util';
import { Stasharr } from '../enums/Stasharr';
import { StashDB } from '../enums/StashDB';
import { render } from 'solid-js/web';
import { BaseController } from './BaseController';
import { ButtonMutationHandler } from '../mutation-handlers/ButtonMutationHandler';
import CardButton from '../components/scene/card/CardButton';
import CopyCardButton from '../components/scene/card/CopyCardButton';

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

    // Check if any scene cards are missing copy buttons
    const allSceneCards = document.querySelectorAll<HTMLElement>(
      StashDB.DOMSelector.SceneCard,
    );
    for (let i = 0; i < allSceneCards.length; i++) {
      const sceneCard = allSceneCards[i];
      const stashId = extractStashIdFromSceneCard(sceneCard);
      if (
        stashId &&
        !sceneCard.querySelector(Stasharr.DOMSelector.CopyCardButton)
      ) {
        return true;
      }
    }

    return false;
  }

  initialize() {
    const sceneCards = document.querySelectorAll<HTMLElement>(
      StashDB.DOMSelector.SceneCard,
    );
    sceneCards.forEach((sceneCard) => {
      const stashId = extractStashIdFromSceneCard(sceneCard);
      if (stashId) {
        // Add the main scene button only if Whisparr is configured
        if (
          this._config.whisparrApiKey !== '' &&
          !sceneCard.querySelector(Stasharr.DOMSelector.CardButton)
        ) {
          render(
            () =>
              CardButton({
                config: this._config,
                stashId: stashId,
              }),
            sceneCard,
          );
        }

        // Always add the copy button regardless of Whisparr configuration
        if (!sceneCard.querySelector(Stasharr.DOMSelector.CopyCardButton)) {
          render(() => CopyCardButton({ stashId: stashId }), sceneCard);
        }
      }
    });
  }
}
