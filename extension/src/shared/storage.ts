import type {
  DiscoverySelections,
  ExtensionSettings,
  DiscoveryCatalogs,
} from './messages.js';

type StorageArea = {
  get: (keys?: string[] | string | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[] | string) => Promise<void>;
};

type ExtStorage = {
  storage: { local: StorageArea };
};

const extCandidate =
  (globalThis as typeof globalThis & { browser?: ExtStorage; chrome?: ExtStorage }).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtStorage }).chrome;

if (!extCandidate) {
  throw new Error('Extension storage not available.');
}
const ext = extCandidate;

const SETTINGS_KEY = 'stasharrSettings';
const CATALOGS_KEY = 'stasharrCatalogs';
const SELECTIONS_KEY = 'stasharrSelections';

type CatalogsState = {
  whisparr: DiscoveryCatalogs & {
    baseUrl?: string;
    apiKeyHash?: string;
  };
};

type SelectionsState = {
  whisparr: DiscoverySelections;
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await ext.storage.local.get(SETTINGS_KEY);
  return (result[SETTINGS_KEY] as ExtensionSettings) ?? {
    whisparrBaseUrl: '',
    whisparrApiKey: '',
    openExternalLinksInNewTab: true,
    searchOnAdd: true,
  };
}

export async function saveSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await ext.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function resetSettings(): Promise<void> {
  await ext.storage.local.remove(SETTINGS_KEY);
}

export async function getCatalogs(): Promise<CatalogsState> {
  const result = await ext.storage.local.get(CATALOGS_KEY);
  return (result[CATALOGS_KEY] as CatalogsState) ?? {
    whisparr: {
      qualityProfiles: [],
      rootFolders: [],
      tags: [],
      fetchedAt: undefined,
      baseUrl: undefined,
      apiKeyHash: undefined,
    },
  };
}

export async function saveCatalogs(
  partial: Partial<CatalogsState>,
): Promise<CatalogsState> {
  const current = await getCatalogs();
  const next = {
    ...current,
    ...partial,
    whisparr: {
      ...current.whisparr,
      ...(partial.whisparr ?? {}),
    },
  };
  await ext.storage.local.set({ [CATALOGS_KEY]: next });
  return next;
}

export async function getSelections(): Promise<SelectionsState> {
  const result = await ext.storage.local.get(SELECTIONS_KEY);
  return (result[SELECTIONS_KEY] as SelectionsState) ?? {
    whisparr: {
      qualityProfileId: null,
      rootFolderPath: null,
      tagIds: [],
    },
  };
}

export async function saveSelections(
  partial: Partial<SelectionsState>,
): Promise<SelectionsState> {
  const current = await getSelections();
  const next = {
    ...current,
    ...partial,
    whisparr: {
      ...current.whisparr,
      ...(partial.whisparr ?? {}),
    },
  };
  await ext.storage.local.set({ [SELECTIONS_KEY]: next });
  return next;
}
