import { getSettings } from './storage.js';

type ExtTabs = {
  tabs?: {
    create?: (details: { url: string }) => Promise<unknown> | void;
    update?: (details: { url: string }) => Promise<unknown> | void;
  };
};

const extCandidate =
  (globalThis as typeof globalThis & { browser?: ExtTabs; chrome?: ExtTabs }).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtTabs }).chrome;

const ext = extCandidate;

type OpenExternalLinkOptions = {
  forceNewTab?: boolean;
};

export async function openExternalLink(
  url: string,
  options?: OpenExternalLinkOptions,
): Promise<void> {
  const settings = await getSettings();
  const preferNewTab = settings.openExternalLinksInNewTab ?? true;
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
