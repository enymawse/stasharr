import { Controller } from './Controller';

export interface MutationHandler {
  handle(mutationList: MutationRecord[], controller: Controller): void;
}
