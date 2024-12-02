import { DetailsController } from '../../controller/scene/DetailsController';
import { DefaultMutationHandler } from '../DefaultMutationHandler';

export class DetailsMutationHandler extends DefaultMutationHandler {
  handle(
    observer: MutationObserver,
    mutationList: MutationRecord[],
    controller: DetailsController,
  ): void {
    if (controller.shouldReinit()) {
      controller.initialize();
    }
  }
}
