(function () {
  const SETTINGS_KEY = 'stasharrSettings';

  const extCandidate =
    (globalThis as typeof globalThis & { browser?: { tabs?: unknown; storage?: unknown } })
      .browser ??
    (globalThis as typeof globalThis & { chrome?: { tabs?: unknown; storage?: unknown } }).chrome;

  const ext = extCandidate as
    | {
        tabs?: {
          create?: (details: { url: string }) => Promise<unknown> | void;
          update?: (details: { url: string }) => Promise<unknown> | void;
        };
        storage?: {
          local?: {
            get?: (keys?: string[] | string | null) => Promise<Record<string, unknown>>;
          };
        };
      }
    | undefined;

  type OpenExternalLinkOptions = {
    forceNewTab?: boolean;
  };

  async function getOpenExternalLinksInNewTab(): Promise<boolean> {
    if (!ext?.storage?.local?.get) {
      return true;
    }
    const result = await ext.storage.local.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] as { openExternalLinksInNewTab?: boolean } | undefined;
    return settings?.openExternalLinksInNewTab ?? true;
  }

  async function openExternalLink(
    url: string,
    options?: OpenExternalLinkOptions,
  ): Promise<void> {
    const preferNewTab = await getOpenExternalLinksInNewTab();
    const shouldOpenNewTab = options?.forceNewTab ?? preferNewTab;

    if (shouldOpenNewTab) {
      if (ext?.tabs?.create) {
        await ext.tabs.create({ url });
        return;
      }
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener');
        return;
      }
    }

    if (typeof window !== 'undefined') {
      window.location.assign(url);
      return;
    }

    if (ext?.tabs?.update) {
      await ext.tabs.update({ url });
    }
  }

  (globalThis as { StasharrNavigation?: { openExternalLink: typeof openExternalLink } }).StasharrNavigation = {
    openExternalLink,
  };
})();
