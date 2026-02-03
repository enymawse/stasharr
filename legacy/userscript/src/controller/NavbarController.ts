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
    console.log('🎯 NavbarController: initialize() called');

    // Check if Stasharr nav link already exists
    const existingStasharrLink = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.nav-link'),
    ).find((link) => link.textContent?.trim() === 'Stasharr');

    if (existingStasharrLink) {
      console.log(
        '🎯 NavbarController: Stasharr nav link already exists, skipping render',
      );
      return;
    }

    const navbar = document.querySelector(StashDB.DOMSelector.Navbar);
    console.log('🎯 NavbarController: navbar found:', !!navbar);

    if (navbar) {
      console.log('🎯 NavbarController: Rendering SettingsModal to navbar');
      render(() => SettingsModal({ config: this._config }), navbar);
      console.log('🎯 NavbarController: SettingsModal render complete');
    }
  }
}
