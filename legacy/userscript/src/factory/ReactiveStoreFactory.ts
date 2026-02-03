import { Config } from '../models/Config';

export class ReactiveStoreFactory {
  static createReactiveStore(store: Config) {
    return () => new Config(store.protocol, store.domain, store.whisparrApiKey);
  }
  static createStashReactiveStore(store: Config) {
    return () =>
      new Config(
        undefined,
        undefined,
        undefined,
        store.stashDomain,
        store.stashApiKey,
      );
  }
}
