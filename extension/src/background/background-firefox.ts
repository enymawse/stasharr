const MESSAGE_TYPES = {
  ping: 'PING',
  fetchJson: 'FETCH_JSON',
  validateConnection: 'VALIDATE_CONNECTION',
  getSettings: 'GET_SETTINGS',
  getConfigStatus: 'GET_CONFIG_STATUS',
  saveSettings: 'SAVE_SETTINGS',
  resetSettings: 'RESET_SETTINGS',
  requestPermission: 'REQUEST_PERMISSION',
  getPermission: 'GET_PERMISSION',
} as const;

type ExtensionSettings = {
  whisparrBaseUrl: string;
  whisparrApiKey: string;
  stashBaseUrl?: string;
  stashApiKey?: string;
  lastValidatedAt?: string;
};

type StorageArea = {
  get: (keys?: string[] | string | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[] | string) => Promise<void>;
};

type FirefoxRuntime = {
  runtime: {
    onMessage: {
      addListener: (
        callback: (request: { type?: string; [key: string]: unknown }, sender: unknown, sendResponse: (response: { [key: string]: unknown }) => void) => void,
      ) => void;
    };
  };
  storage: { local: StorageArea };
  permissions?: {
    request: (details: { origins: string[] }) => Promise<boolean>;
    contains: (details: { origins: string[] }) => Promise<boolean>;
  };
};

const extCandidate =
  (globalThis as typeof globalThis & { browser?: FirefoxRuntime; chrome?: FirefoxRuntime }).browser ??
  (globalThis as typeof globalThis & { chrome?: FirefoxRuntime }).chrome;

if (!extCandidate) {
  throw new Error('Extension runtime not available.');
}
const ext = extCandidate;

const SETTINGS_KEY = 'stasharrSettings';
const VERSION = '0.1.0';
const REQUEST_TIMEOUT_MS = 10_000;

async function getSettings(): Promise<ExtensionSettings> {
  const result = await ext.storage.local.get(SETTINGS_KEY);
  return (result[SETTINGS_KEY] as ExtensionSettings) ?? {
    whisparrBaseUrl: '',
    whisparrApiKey: '',
  };
}

async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await ext.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

async function resetSettings(): Promise<void> {
  await ext.storage.local.remove(SETTINGS_KEY);
}

function normalizeBaseUrl(raw: string): { ok: boolean; value?: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Base URL is required.' };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'Base URL must include a scheme (http or https).' };
  }

  try {
    const url = new URL(trimmed);
    const normalized = `${url.origin}${url.pathname}`.replace(/\/+$/, '');
    return { ok: true, value: normalized };
  } catch {
    return { ok: false, error: 'Base URL is invalid.' };
  }
}

async function handleFetchJson(request: { url?: string; method?: string; headers?: Record<string, string>; body?: string }) {
  if (!request.url) {
    return { ok: false, type: MESSAGE_TYPES.fetchJson, error: 'URL is required.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.debug('[stasharr][background] fetch', {
      url: request.url,
      isServiceWorker: typeof window === 'undefined',
    });

    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    let json: unknown;
    let text: string | undefined;

    if (contentType.includes('application/json')) {
      try {
        json = await response.json();
      } catch (error) {
        return {
          ok: false,
          type: MESSAGE_TYPES.fetchJson,
          status: response.status,
          error: `JSON parse error: ${(error as Error).message}`,
        };
      }
    } else {
      text = await response.text();
    }

    return {
      ok: response.ok,
      type: MESSAGE_TYPES.fetchJson,
      status: response.status,
      json,
      text,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { ok: false, type: MESSAGE_TYPES.fetchJson, error: 'Timeout' };
    }

    return {
      ok: false,
      type: MESSAGE_TYPES.fetchJson,
      error: `Network error: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleValidateConnection(baseUrl: string, apiKey: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  if (!apiKey.trim()) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: 'API key is required.',
    };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/system/status`,
    headers: { 'X-Api-Key': apiKey.trim() },
  });

  if (!response.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      status: response.status,
      error: response.error ?? 'Validation failed.',
      data: response.json ?? response.text,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.validateConnection,
    status: response.status,
    data: response.json ?? response.text,
  };
}

ext.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const respond = async () => {
    if (request?.type === MESSAGE_TYPES.ping) {
      return {
        ok: true,
        type: MESSAGE_TYPES.ping,
        version: VERSION,
        timestamp: new Date().toISOString(),
      };
    }

    if (request?.type === MESSAGE_TYPES.fetchJson) {
      return handleFetchJson(request as { url?: string; method?: string; headers?: Record<string, string>; body?: string });
    }

    if (request?.type === MESSAGE_TYPES.validateConnection) {
      const { baseUrl, apiKey } = request as { baseUrl: string; apiKey: string };
      return handleValidateConnection(baseUrl, apiKey);
    }

    if (request?.type === MESSAGE_TYPES.getSettings) {
      const settings = await getSettings();
      return { ok: true, type: MESSAGE_TYPES.getSettings, settings };
    }

    if (request?.type === MESSAGE_TYPES.getConfigStatus) {
      const settings = await getSettings();
      return {
        ok: true,
        type: MESSAGE_TYPES.getConfigStatus,
        configured: Boolean(settings.whisparrBaseUrl && settings.whisparrApiKey),
      };
    }

    if (request?.type === MESSAGE_TYPES.saveSettings) {
      const { settings } = request as { settings: Partial<ExtensionSettings> };
      const next = await saveSettings(settings);
      return { ok: true, type: MESSAGE_TYPES.saveSettings, settings: next };
    }

    if (request?.type === MESSAGE_TYPES.resetSettings) {
      await resetSettings();
      return { ok: true, type: MESSAGE_TYPES.resetSettings };
    }

    if (request?.type === MESSAGE_TYPES.requestPermission) {
      if (!ext.permissions?.request) {
        return { ok: false, type: MESSAGE_TYPES.requestPermission, granted: false, error: 'Permissions API not available.' };
      }
      try {
        const granted = await ext.permissions.request({ origins: [(request as { origin: string }).origin] });
        return { ok: true, type: MESSAGE_TYPES.requestPermission, granted };
      } catch (error) {
        return { ok: false, type: MESSAGE_TYPES.requestPermission, granted: false, error: (error as Error).message };
      }
    }

    if (request?.type === MESSAGE_TYPES.getPermission) {
      if (!ext.permissions?.contains) {
        return { ok: false, type: MESSAGE_TYPES.getPermission, granted: false, error: 'Permissions API not available.' };
      }
      try {
        const granted = await ext.permissions.contains({ origins: [(request as { origin: string }).origin] });
        return { ok: true, type: MESSAGE_TYPES.getPermission, granted };
      } catch (error) {
        return { ok: false, type: MESSAGE_TYPES.getPermission, granted: false, error: (error as Error).message };
      }
    }

    return { ok: false, type: MESSAGE_TYPES.fetchJson, error: 'Unknown message type' };
  };

  respond()
    .then((response) => sendResponse(response))
    .catch((error) =>
      sendResponse({
        ok: false,
        type: MESSAGE_TYPES.fetchJson,
        error: `Unhandled error: ${(error as Error).message}`,
      }),
    );

  return true;
});
