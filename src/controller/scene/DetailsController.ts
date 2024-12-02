import { render } from 'solid-js/web';
import { Stasharr } from '../../enums/Stasharr';
import { StashDB } from '../../enums/StashDB';
import { Config } from '../../models/Config';
import { DetailsMutationHandler } from '../../mutation-handlers/scene/DetailsMutationHandler';
import { BaseController } from '../BaseController';
import Details from '../../components/scene/header/Details';
import { extractStashIdFromPath } from '../../util/util';
import SceneButton from '../../components/SceneButton';

export class DetailsController extends BaseController {
  initialize(): void {
    const details = document.querySelector(Stasharr.DOMSelector.HeaderDetails);
    const floatEnd = document.querySelector(
      StashDB.DOMSelector.SceneInfoCardHeaderFloatEnd,
    );
    const stashId = extractStashIdFromPath();
    if (floatEnd !== null && stashId !== null && details === null) {
      render(
        () => Details({ config: this._config, stashId: stashId }),
        floatEnd,
      );
    }
    const headerButton = document.querySelector(
      Stasharr.DOMSelector.HeaderButton,
    );
    const cardHeader: HTMLElement | null = document.querySelector<HTMLElement>(
      StashDB.DOMSelector.SceneInfoCardHeader,
    );
    if (headerButton === null && stashId !== null && cardHeader !== null) {
      render(
        () =>
          SceneButton({ config: this._config, stashId: stashId, header: true }),
        cardHeader,
      );
    }
  }
  shouldReinit(): boolean {
    const details = document.querySelector(Stasharr.DOMSelector.HeaderDetails);
    const headerButton = document.querySelector(
      Stasharr.DOMSelector.HeaderButton,
    );
    if (
      document.querySelector(StashDB.DOMSelector.SceneInfoCardHeader) &&
      details === null &&
      headerButton === null
    ) {
      return true;
    }
    return false;
  }
  constructor(private _config: Config) {
    super(new DetailsMutationHandler());
  }
}
