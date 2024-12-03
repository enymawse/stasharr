import { render } from 'solid-js/web';
import SettingsModal from '../components/settings/SettingsModal';
import { Config } from '../models/Config';
import { BaseController } from './BaseController';
import { StashDB } from '../enums/StashDB';
import { DefaultMutationHandler } from '../mutation-handlers/DefaultMutationHandler';

export class NavbarController extends BaseController {
  constructor(private _config: Config) {
    super(new DefaultMutationHandler());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldReinit(node: HTMLElement): boolean {
    let b = true;
    document
      .querySelectorAll<HTMLAnchorElement>('.nav-link')
      .forEach((link) => {
        if (link.text === 'Stasharr') {
          b = false;
          return;
        }
      });
    return b;
  }

  initialize(): void {
    const navbar = document.querySelector(StashDB.DOMSelector.Navbar);
    if (navbar) {
      render(() => SettingsModal({ config: this._config }), navbar);
    }
  }
}
