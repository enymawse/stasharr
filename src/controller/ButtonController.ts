import { Config } from '../models/Config';
import { extractStashIdFromSceneCard } from '../util/util';
import { Stasharr } from '../enums/Stasharr';
import { StashDB } from '../enums/StashDB';
import { render } from 'solid-js/web';
import SceneButton from '../components/SceneButton';
import { BaseController } from './BaseController';
import { ButtonMutationHandler } from '../mutation-handlers/ButtonMutationHandler';
import WhisparrCardButton from '../components/scene/WhisparrCardButton';

export class ButtonController extends BaseController {
  constructor(private _config: Config) {
    super(new ButtonMutationHandler());
  }

  shouldReinit(node: HTMLElement): boolean {
    const selector = `${StashDB.DOMSelector.SceneCard}, ${StashDB.DOMSelector.SceneInfoCardHeader}`;
    if (node.matches(selector) || node.querySelector(selector)) {
      return true;
    }
    return false;
  }

  initialize() {
    if (this._config.whisparrApiKey == '') return;
    const sceneCards = document.querySelectorAll<HTMLElement>(
      StashDB.DOMSelector.SceneCard,
    );
    sceneCards.forEach(async (sceneCard) => {
      const stashId = extractStashIdFromSceneCard(sceneCard);
      if (stashId) {
        if (!sceneCard.querySelector(Stasharr.DOMSelector.CardButton)) {
          render(
            () =>
              SceneButton({
                config: this._config,
                stashId: stashId,
                header: false,
              }),
            sceneCard,
          );
        }
        if (!sceneCard.querySelector(Stasharr.DOMSelector.WhisparrCardButton)) {
          render(
            () =>
              WhisparrCardButton({
                config: this._config,
                stashId: stashId,
              }),
            sceneCard,
          );
        }
      }
    });

    const cardHeader: HTMLElement | null = document.querySelector<HTMLElement>(
      StashDB.DOMSelector.SceneInfoCardHeader,
    );

    if (
      cardHeader &&
      !document.querySelector(Stasharr.DOMSelector.HeaderButton)
    ) {
      const stashId = extractStashIdFromSceneCard();
      if (stashId) {
        render(
          () =>
            SceneButton({
              config: this._config,
              stashId: stashId,
              header: true,
            }),
          cardHeader,
        );
      }
    }
  }
}
