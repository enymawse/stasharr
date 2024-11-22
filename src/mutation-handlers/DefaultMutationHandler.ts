import { Controller } from '../interfaces/Controller';
import { MutationHandler } from '../interfaces/MutationHandler';

export class DefaultMutationHandler implements MutationHandler {
  handle(mutationList: MutationRecord[], controller: Controller): void {
    mutationList.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (controller.shouldReinit(node)) {
              controller.initialize();
            }
          }
        });
      }
    });
  }
}
