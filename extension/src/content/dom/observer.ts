type DomObserverOptions = {
  target: ParentNode;
  onChange: () => void;
  debounceMs?: number;
};

function shouldRescan(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
      return true;
    }
  }
  return false;
}

export function createDebouncedMutationObserver(options: DomObserverOptions) {
  const debounceMs = options.debounceMs ?? 150;
  let debounceHandle: number | null = null;
  const observer = new MutationObserver((mutations) => {
    if (!shouldRescan(mutations)) return;
    if (debounceHandle !== null) {
      window.clearTimeout(debounceHandle);
    }
    debounceHandle = window.setTimeout(() => {
      debounceHandle = null;
      options.onChange();
    }, debounceMs);
  });
  observer.observe(options.target, { childList: true, subtree: true });
  return observer;
}

export function createLocationObserver(options: {
  onChange: () => void;
  intervalMs?: number;
}) {
  const intervalMs = options.intervalMs ?? 500;
  let lastUrl = window.location.href;
  const checkNavigation = () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      options.onChange();
    }
  };
  window.addEventListener('popstate', checkNavigation);
  const intervalId = window.setInterval(checkNavigation, intervalMs);
  return () => {
    window.removeEventListener('popstate', checkNavigation);
    window.clearInterval(intervalId);
  };
}
