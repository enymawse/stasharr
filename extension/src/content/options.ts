import { MESSAGE_TYPES, type ExtensionSettings } from '../shared/messages';

type ExtRuntime = {
  runtime: {
    sendMessage: (message: { type: string; [key: string]: unknown }) => Promise<{
      ok: boolean;
      error?: string;
      settings?: ExtensionSettings;
      granted?: boolean;
      status?: number;
    }>;
  };
};

const extCandidate =
  (globalThis as typeof globalThis & { browser?: ExtRuntime; chrome?: ExtRuntime }).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtRuntime }).chrome;

if (!extCandidate) {
  throw new Error('Extension runtime not available.');
}
const ext = extCandidate;

type FormState = {
  whisparrBaseUrl: string;
  whisparrApiKey: string;
  lastValidatedAt?: string;
};

const elements = {
  baseUrl: document.querySelector('[data-field="whisparrBaseUrl"]') as HTMLInputElement,
  apiKey: document.querySelector('[data-field="whisparrApiKey"]') as HTMLInputElement,
  status: document.querySelector('[data-status]') as HTMLElement,
  permission: document.querySelector('[data-permission]') as HTMLElement,
  validate: document.querySelector('[data-action="validate"]') as HTMLButtonElement,
  save: document.querySelector('[data-action="save"]') as HTMLButtonElement,
  reveal: document.querySelector('[data-action="reveal"]') as HTMLButtonElement,
};

if (
  !elements.baseUrl ||
  !elements.apiKey ||
  !elements.status ||
  !elements.permission ||
  !elements.validate ||
  !elements.save ||
  !elements.reveal
) {
  throw new Error('Options UI elements missing.');
}

function setStatus(message: string, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? '#ef4444' : '#9ca3af';
}

function setPermission(message: string, isError = false) {
  elements.permission.textContent = message;
  elements.permission.style.color = isError ? '#ef4444' : '#9ca3af';
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

function hostOriginPattern(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return `${parsed.protocol}//${parsed.host}/*`;
}


async function loadSettings() {
  const response = await ext.runtime.sendMessage({ type: MESSAGE_TYPES.getSettings });
  if (!response.ok || !response.settings) {
    setStatus('Unable to load settings.', true);
    return;
  }

  const settings = response.settings;
  elements.baseUrl.value = settings.whisparrBaseUrl ?? '';
  elements.apiKey.value = settings.whisparrApiKey ?? '';

  const configured =
    Boolean(settings.whisparrBaseUrl) && Boolean(settings.whisparrApiKey);
  setStatus(configured ? 'Configured.' : 'Not configured.');

  if (settings.lastValidatedAt) {
    setStatus(`Last validated: ${new Date(settings.lastValidatedAt).toLocaleString()}`);
  }

  await refreshPermission();
}

async function refreshPermission() {
  const normalized = normalizeBaseUrl(elements.baseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setPermission(normalized.error ?? 'Invalid base URL.', true);
    return;
  }

  const origin = hostOriginPattern(normalized.value);
  const response = await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.getPermission,
    origin,
  });

  if (!response.ok) {
    setPermission(response.error ?? 'Permission check failed.', true);
    return;
  }

  setPermission(
    response.granted
      ? `Permission granted for ${origin}`
      : `Permission missing for ${origin}`,
  );
}

async function requestPermission(): Promise<boolean> {
  const normalized = normalizeBaseUrl(elements.baseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setPermission(normalized.error ?? 'Invalid base URL.', true);
    return false;
  }

  const origin = hostOriginPattern(normalized.value);
  const response = await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.requestPermission,
    origin,
  });

  if (!response.ok) {
    setPermission(response.error ?? 'Permission request failed.', true);
    return false;
  }

  if (!response.granted) {
    setPermission(`Permission required to access ${origin}. Grant permission to proceed.`, true);
    return false;
  }

  setPermission(`Permission granted for ${origin}`);
  return true;
}

async function saveSettings() {
  const normalized = normalizeBaseUrl(elements.baseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setStatus(normalized.error ?? 'Invalid base URL.', true);
    return;
  }

  const settings: FormState = {
    whisparrBaseUrl: normalized.value,
    whisparrApiKey: elements.apiKey.value.trim(),
  };

  if (!settings.whisparrApiKey) {
    setStatus('API key is required.', true);
    return;
  }

  const response = await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.saveSettings,
    settings,
  });

  if (!response.ok) {
    setStatus(response.error ?? 'Save failed.', true);
    return;
  }

  setStatus('Settings saved.');
  await refreshPermission();
}

async function validateSettings() {
  const normalized = normalizeBaseUrl(elements.baseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setStatus(normalized.error ?? 'Invalid base URL.', true);
    return;
  }

  const apiKey = elements.apiKey.value.trim();
  if (!apiKey) {
    setStatus('API key is required.', true);
    return;
  }

  const permitted = await requestPermission();
  if (!permitted) {
    setStatus('Permission required before validation.', true);
    return;
  }

  const response = await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.validateConnection,
    baseUrl: normalized.value,
    apiKey,
    kind: 'whisparr',
  });

  if (!response.ok) {
    const status = response.status ? ` (${response.status})` : '';
    setStatus(`Validation failed${status}: ${response.error ?? 'Unknown error'}`, true);
    return;
  }

  await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.saveSettings,
    settings: {
      whisparrBaseUrl: normalized.value,
      whisparrApiKey: apiKey,
      lastValidatedAt: new Date().toISOString(),
    },
  });

  setStatus(`Validated at ${new Date().toLocaleString()}`);
}

elements.save.addEventListener('click', () => {
  void saveSettings();
});

elements.validate.addEventListener('click', () => {
  void validateSettings();
});

elements.reveal.addEventListener('click', () => {
  if (elements.apiKey.type === 'password') {
    elements.apiKey.type = 'text';
    elements.reveal.textContent = 'Hide';
  } else {
    elements.apiKey.type = 'password';
    elements.reveal.textContent = 'Show';
  }
});

void loadSettings();
