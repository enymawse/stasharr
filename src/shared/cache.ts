type TtlCacheOptions = {
  ttlMs: number;
  maxSize?: number;
};

type CacheEntry<V> = {
  value: V;
  storedAt: number;
};

export function createTtlCache<K, V>(options: TtlCacheOptions) {
  const store = new Map<K, CacheEntry<V>>();
  const ttlMs = options.ttlMs;
  const maxSize = options.maxSize;

  const isExpired = (entry: CacheEntry<V>, now: number) =>
    ttlMs > 0 && now - entry.storedAt > ttlMs;

  const pruneOldest = () => {
    if (!maxSize) return;
    while (store.size > maxSize) {
      const firstKey = store.keys().next().value as K | undefined;
      if (firstKey === undefined) return;
      store.delete(firstKey);
    }
  };

  const get = (key: K): V | undefined => {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (isExpired(entry, Date.now())) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  };

  const set = (key: K, value: V) => {
    store.set(key, { value, storedAt: Date.now() });
    pruneOldest();
  };

  const del = (key: K) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  function* entries(): IterableIterator<[K, V]> {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (isExpired(entry, now)) {
        store.delete(key);
        continue;
      }
      yield [key, entry.value];
    }
  }

  function* values(): IterableIterator<V> {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (isExpired(entry, now)) {
        store.delete(key);
        continue;
      }
      yield entry.value;
    }
  }

  return {
    get,
    set,
    delete: del,
    clear,
    entries,
    values,
    size: () => store.size,
  };
}
