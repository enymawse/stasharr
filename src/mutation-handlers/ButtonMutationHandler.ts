import { CardController } from '../controller/CardController';
import { DefaultMutationHandler } from './DefaultMutationHandler';

export class ButtonMutationHandler extends DefaultMutationHandler {
  handle(
    observer: MutationObserver,
    mutationList: MutationRecord[],
    controller: CardController,
  ): void {
    if (controller.shouldReinit()) {
      controller.initialize();
    }
  }
}
