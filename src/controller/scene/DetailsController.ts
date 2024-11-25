import { render } from 'solid-js/web';
import { Stasharr } from '../../enums/Stasharr';
import { StashDB } from '../../enums/StashDB';
import { Config } from '../../models/Config';
import { DetailsMutationHandler } from '../../mutation-handlers/scene/DetailsMutationHandler';
import { BaseController } from '../BaseController';
import Details from '../../components/scene/Details';
import { extractStashIdFromPath } from '../../util/util';

export class DetailsController extends BaseController {
  initialize(): void {
    const details = document.querySelector<HTMLDivElement>(
      Stasharr.DOMSelector.HeaderDetails,
    );
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
  }
  shouldReinit(node: HTMLElement): boolean {
    if (
      node.matches(StashDB.DOMSelector.SceneInfoCardHeader) ||
      node.querySelector(StashDB.DOMSelector.SceneInfoCardHeader)
    ) {
      return true;
    }
    return false;
  }
  constructor(private _config: Config) {
    super(new DetailsMutationHandler());
  }
}
