import { Controller } from '../interfaces/Controller';
import { MutationHandler } from '../interfaces/MutationHandler';
import { ObserverConfig } from '../util/util';

export class MutationObserverFactory {
  static createObserver(
    handler: MutationHandler,
    controller: Controller,
  ): MutationObserver {
    const obs = new MutationObserver((mutationList, observer) => {
      handler.handle(observer, mutationList, controller);
    });
    obs.observe(document.body, ObserverConfig);
    return obs;
  }
}
