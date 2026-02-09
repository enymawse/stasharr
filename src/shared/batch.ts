type BatcherOptions<T> = {
  maxBatch: number;
  maxWaitMs: number;
  handler: (items: T[]) => Promise<void> | void;
};

export function createBatcher<T>(options: BatcherOptions<T>) {
  const queue: T[] = [];
  const maxBatch = options.maxBatch;
  const maxWaitMs = options.maxWaitMs;
  let timer: number | null = null;
  let inFlight = false;

  const schedule = () => {
    if (timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      void flush();
    }, maxWaitMs);
  };

  const enqueue = (item: T) => {
    queue.push(item);
    schedule();
  };

  const enqueueAll = (items: T[]) => {
    if (items.length === 0) return;
    queue.push(...items);
    schedule();
  };

  const clear = () => {
    queue.length = 0;
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const flush = async () => {
    if (inFlight) return;
    if (queue.length === 0) return;
    inFlight = true;
    const batch = queue.splice(0, maxBatch);
    try {
      await options.handler(batch);
    } finally {
      inFlight = false;
      if (queue.length > 0) {
        schedule();
      }
    }
  };

  return { enqueue, enqueueAll, clear, flush };
}
