import { MutationObserverFactory } from '../factory/MutationObserverFactory';
import { Controller } from '../interfaces/Controller';
import { MutationHandler } from '../interfaces/MutationHandler';
import { TooltipManager } from '../service/TooltipManager';

export abstract class BaseController implements Controller {
  observer: MutationObserver;
  constructor(handler: MutationHandler) {
    this.observer = MutationObserverFactory.createObserver(handler, this);
  }
  abstract initialize(): void;
  abstract shouldReinit(node: HTMLElement): boolean;

  protected reinitializeTooltips(): void {
    TooltipManager.reinitializeTooltips();
  }

  protected cleanupTooltips(): void {
    TooltipManager.cleanupOrphaned();
  }
}
