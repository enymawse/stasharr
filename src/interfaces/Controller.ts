export interface Controller {
  initialize(): void;
  shouldReinit(node: HTMLElement): boolean;
}
