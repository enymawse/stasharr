import { MutationObserverFactory } from '../factory/MutationObserverFactory';
import { Controller } from '../interfaces/Controller';
import { MutationHandler } from '../interfaces/MutationHandler';

export abstract class BaseController implements Controller {
  observer: MutationObserver;
  constructor(handler: MutationHandler) {
    this.observer = MutationObserverFactory.createObserver(handler, this);
  }
  abstract initialize(): void;
  abstract shouldReinit(node: HTMLElement): boolean;
}
