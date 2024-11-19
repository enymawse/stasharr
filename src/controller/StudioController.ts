import { Config } from '../models/Config';
import { extractStashIdFromPath } from '../util/util';
import { StashDB } from '../enums/StashDB';
import { render } from 'solid-js/web';
import Studio from '../components/Studio';

export class StudioController {
  static initialize(config: Config) {
    const studioStashId = extractStashIdFromPath();
    if (config.whisparrApiKey == '' || studioStashId == null) return;

    const studioTitleH3: HTMLElement | null =
      document.querySelector<HTMLElement>(
        StashDB.DOMSelector.StudioTitle + ' > h3',
      );

    if (studioTitleH3) {
      render(
        () => Studio({ config: config, stashId: studioStashId }),
        studioTitleH3,
      );
    }
  }
}
