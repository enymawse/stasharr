import { render } from 'solid-js/web';
import NavbarLink from '../components/NavbarLink';

export class NavbarController {
  private observer: MutationObserver = new MutationObserver((mutationList) => {
    for (const mutationRecord of mutationList) {
      if (
        mutationRecord.type === 'childList' &&
        mutationRecord.addedNodes.length > 0
      ) {
        mutationRecord.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.querySelector('nav.navbar > .navbar-nav')) {
              const navbar = document.querySelector('nav.navbar > .navbar-nav');
              if (navbar) {
                render(NavbarLink, navbar);
                this.observer.disconnect();
                return;
              }
            }
          }
        });
      }
    }
  });

  constructor(body: HTMLElement) {
    this.observer.observe(body, { childList: true, subtree: true });
  }
}
