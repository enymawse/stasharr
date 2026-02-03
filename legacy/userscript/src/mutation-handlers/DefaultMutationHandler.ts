import { Controller } from '../interfaces/Controller';
import { MutationHandler } from '../interfaces/MutationHandler';
import { ObserverConfig } from '../util/util';

export class DefaultMutationHandler implements MutationHandler {
  handle(
    observer: MutationObserver,
    mutationList: MutationRecord[],
    controller: Controller,
  ): void {
    mutationList.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            observer.disconnect();
            if (controller.shouldReinit(node)) {
              controller.initialize();
            }
            observer.observe(document.body, ObserverConfig);
          }
        });
      }
    });
  }
}
