import { Stasharr } from '../enums/Stasharr';

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
                navbar.appendChild(this.createSettingsModalLink());
                this.observer.disconnect();
                return;
              }
            }
          }
        });
      }
    }
  });

  private createSettingsModalLink(): HTMLElement {
    let aLink = document.createElement('a');
    aLink.classList.add('nav-link');
    aLink.href = '#';
    aLink.innerText = 'Stasharr';
    aLink.setAttribute('data-bs-toggle', 'modal');
    aLink.setAttribute('data-bs-target', Stasharr.DOMSelector.SettingsModal);
    return aLink;
  }

  constructor(body: HTMLElement) {
    this.observer.observe(body, { childList: true, subtree: true });
  }
}
