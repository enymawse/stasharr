import { Controller } from './Controller';

export interface MutationHandler {
  handle(
    observer: MutationObserver,
    mutationList: MutationRecord[],
    controller: Controller,
  ): void;
}
