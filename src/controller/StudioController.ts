import { Config } from '../models/Config';
import { extractStashIdFromPath } from '../util/util';
import { StashDB } from '../enums/StashDB';
import { render } from 'solid-js/web';
import Studio from '../components/Studio';
import { BaseController } from './BaseController';
import { StudioMutationHandler } from '../mutation-handlers/StudioMutationHandler';

export class StudioController extends BaseController {
  constructor(private _config: Config) {
    super(new StudioMutationHandler());
  }

  shouldReinit(node: HTMLElement): boolean {
    if (
      node.matches(StashDB.DOMSelector.StudioTitle) ||
      node.querySelector(StashDB.DOMSelector.StudioTitle)
    ) {
      return true;
    }
    return false;
  }

  initialize() {
    const studioStashId = extractStashIdFromPath();
    if (this._config.whisparrApiKey == '' || studioStashId == null) return;

    const studioTitleH3: HTMLElement | null =
      document.querySelector<HTMLElement>(
        StashDB.DOMSelector.StudioTitle + ' > h3',
      );

    if (studioTitleH3) {
      render(
        () => Studio({ config: this._config, stashId: studioStashId }),
        studioTitleH3,
      );
    }
  }
}
