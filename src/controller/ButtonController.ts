import { Config } from '../models/Config';
import { extractStashIdFromSceneCard } from '../util/util';
import { Stasharr } from '../enums/Stasharr';
import { StashDB } from '../enums/StashDB';
import { render } from 'solid-js/web';
import SceneButton from '../components/SceneButton';
import { BaseController } from './BaseController';
import { ButtonMutationHandler } from '../mutation-handlers/ButtonMutationHandler';

export class ButtonController extends BaseController {
  constructor(private _config: Config) {
    super(new ButtonMutationHandler());
  }

  shouldReinit(node: HTMLElement): boolean {
    if (
      node.matches(
        StashDB.DOMSelector.SceneCard +
          ', ' +
          StashDB.DOMSelector.SceneInfoCardHeader,
      ) ||
      node.querySelector(
        StashDB.DOMSelector.SceneCard +
          ', ' +
          StashDB.DOMSelector.SceneInfoCardHeader,
      )
    ) {
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
      if (!sceneCard.querySelector(Stasharr.DOMSelector.CardButton)) {
        const stashId = extractStashIdFromSceneCard(sceneCard);
        if (stashId) {
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
      }
    });

    const cardHeader: HTMLElement | null = document.querySelector<HTMLElement>(
      StashDB.DOMSelector.SceneInfoCardHeader,
    );

    if (cardHeader && !document.querySelector(`#${Stasharr.ID.HeaderButton}`)) {
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
