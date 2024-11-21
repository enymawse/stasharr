import { render } from 'solid-js/web';
import SettingsModal from '../components/SettingsModal';
import { Config } from '../models/Config';

export class NavbarController {
  private observer: MutationObserver = new MutationObserver(() => {
    const navbar = document.querySelector('nav.navbar > .navbar-nav');
    if (navbar) {
      render(() => SettingsModal({ config: this.config }), navbar);
      this.observer.disconnect();
      return;
    }
  });

  constructor(
    private config: Config,
    private body: HTMLElement,
  ) {
    this.observer.observe(this.body, { childList: true, subtree: true });
  }
}
