import type { ExtensionSettings } from './messages';

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

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await ext.storage.local.get(SETTINGS_KEY);
  return (result[SETTINGS_KEY] as ExtensionSettings) ?? {
    whisparrBaseUrl: '',
    whisparrApiKey: '',
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
