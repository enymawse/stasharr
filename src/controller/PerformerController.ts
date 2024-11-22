import { StashDB } from '../enums/StashDB';
import { Config } from '../models/Config';
import { extractStashIdFromPath } from '../util/util';
import Performer from '../components/Performer';
import { render } from 'solid-js/web';
import { PerformerMutationHandler } from '../mutation-handlers/PerformerMutationHandler';
import { BaseController } from './BaseController';

export class PerformerController extends BaseController {
  constructor(private _config: Config) {
    super(new PerformerMutationHandler());
  }
  shouldReinit(node: HTMLElement): boolean {
    if (node.matches(StashDB.DOMSelector.PerformerInfo)) {
      return true;
    }
    return false;
  }
  initialize(): void {
    const performerStashId = extractStashIdFromPath();
    if (this._config.whisparrApiKey == '' || performerStashId == null) return;

    const performerTitle = document.querySelector(
      StashDB.DOMSelector.PerformerCardHeader,
    );

    if (performerTitle) {
      render(
        () => Performer({ config: this._config, stashId: performerStashId }),
        performerTitle,
      );
    }
  }
}
