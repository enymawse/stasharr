export interface Controller {
  observer: MutationObserver;
  initialize(): void;
  shouldReinit(node: HTMLElement): boolean;
}
