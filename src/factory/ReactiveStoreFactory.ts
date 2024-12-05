import { Config } from '../models/Config';

export class ReactiveStoreFactory {
  static createReactiveStore(store: Config) {
    return () => new Config(store.protocol, store.domain, store.whisparrApiKey);
  }
}
