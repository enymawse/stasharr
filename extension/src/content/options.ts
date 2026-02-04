import {
  MESSAGE_TYPES,
  type ExtensionSettings,
  type FetchDiscoveryCatalogsResponse,
  type SaveSelectionsResponse,
} from '../shared/messages.js';

type ExtRuntime = {
  runtime: {
    sendMessage: (message: { type: string; [key: string]: unknown }) => Promise<{
      ok: boolean;
      error?: string;
      settings?: ExtensionSettings;
      granted?: boolean;
      status?: number;
      catalogs?: FetchDiscoveryCatalogsResponse['catalogs'];
      selections?: FetchDiscoveryCatalogsResponse['selections'];
      errors?: FetchDiscoveryCatalogsResponse['errors'];
      invalidSelections?: FetchDiscoveryCatalogsResponse['invalidSelections'];
    }>;
  };
  permissions?: {
    request: (details: { origins: string[] }) => Promise<boolean>;
    contains: (details: { origins: string[] }) => Promise<boolean>;
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
  refresh: document.querySelector('[data-action="refresh"]') as HTMLButtonElement,
  stashBaseUrl: document.querySelector('[data-field="stashBaseUrl"]') as HTMLInputElement,
  stashApiKey: document.querySelector('[data-field="stashApiKey"]') as HTMLInputElement,
  stashStatus: document.querySelector('[data-stash-status]') as HTMLElement,
  stashPermission: document.querySelector('[data-stash-permission]') as HTMLElement,
  stashValidate: document.querySelector('[data-action="stash-validate"]') as HTMLButtonElement,
  stashSave: document.querySelector('[data-action="stash-save"]') as HTMLButtonElement,
  stashReveal: document.querySelector('[data-action="stash-reveal"]') as HTMLButtonElement,
  stashSpinner: document.querySelector('[data-stash-spinner]') as HTMLElement,
  discoveryStatus: document.querySelector('[data-discovery-status]') as HTMLElement,
  qualitySelect: document.querySelector('[data-field="qualityProfileId"]') as HTMLSelectElement,
  rootSelect: document.querySelector('[data-field="rootFolderPath"]') as HTMLSelectElement,
  labelsSelect: document.querySelector('[data-field="labelIds"]') as HTMLSelectElement,
  qualityStatus: document.querySelector('[data-status="qualityProfiles"]') as HTMLElement,
  rootStatus: document.querySelector('[data-status="rootFolders"]') as HTMLElement,
  labelsStatus: document.querySelector('[data-status="labels"]') as HTMLElement,
};

if (
  !elements.baseUrl ||
  !elements.apiKey ||
  !elements.status ||
  !elements.permission ||
  !elements.validate ||
  !elements.save ||
  !elements.reveal ||
  !elements.refresh ||
  !elements.stashBaseUrl ||
  !elements.stashApiKey ||
  !elements.stashStatus ||
  !elements.stashPermission ||
  !elements.stashValidate ||
  !elements.stashSave ||
  !elements.stashReveal ||
  !elements.stashSpinner ||
  !elements.discoveryStatus ||
  !elements.qualitySelect ||
  !elements.rootSelect ||
  !elements.labelsSelect ||
  !elements.qualityStatus ||
  !elements.rootStatus ||
  !elements.labelsStatus
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

function setStashStatus(message: string, isError = false) {
  elements.stashStatus.textContent = message;
  elements.stashStatus.style.color = isError ? '#ef4444' : '#9ca3af';
}

function setStashPermission(message: string, isError = false) {
  elements.stashPermission.textContent = message;
  elements.stashPermission.style.color = isError ? '#ef4444' : '#9ca3af';
}

function setStashBusy(isBusy: boolean) {
  elements.stashValidate.disabled = isBusy;
  elements.stashSave.disabled = isBusy;
  elements.stashSpinner.classList.toggle('is-active', isBusy);
}

function setDiscoveryStatus(message: string, isError = false) {
  elements.discoveryStatus.textContent = message;
  elements.discoveryStatus.style.color = isError ? '#ef4444' : '#9ca3af';
}

function setSectionStatus(
  element: HTMLElement,
  message: string,
  isError = false,
) {
  element.textContent = message;
  element.style.color = isError ? '#ef4444' : '#9ca3af';
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

const labelKey = String.fromCharCode(116, 97, 103, 115);
type UiSelections = NonNullable<FetchDiscoveryCatalogsResponse['selections']>;
let discoveryEnabled = false;
let currentSelections: UiSelections = {
  qualityProfileId: null,
  rootFolderPath: null,
  labelIds: [],
};

async function loadSettings() {
  const response = await ext.runtime.sendMessage({ type: MESSAGE_TYPES.getSettings });
  if (!response.ok || !response.settings) {
    setStatus('Unable to load settings.', true);
    return;
  }

  const settings = response.settings;
  elements.baseUrl.value = settings.whisparrBaseUrl ?? '';
  elements.apiKey.value = settings.whisparrApiKey ?? '';
  elements.stashBaseUrl.value = settings.stashBaseUrl ?? '';
  elements.stashApiKey.value = settings.stashApiKey ?? '';

  const configured =
    Boolean(settings.whisparrBaseUrl) && Boolean(settings.whisparrApiKey);
  setStatus(configured ? 'Configured.' : 'Not configured.');

  const stashConfigured =
    Boolean(settings.stashBaseUrl) && Boolean(settings.stashApiKey);
  setStashStatus(stashConfigured ? 'Configured.' : 'Not configured.');

  if (settings.lastValidatedAt) {
    setStatus(`Last validated: ${new Date(settings.lastValidatedAt).toLocaleString()}`);
  }

  await refreshPermission();
  await refreshStashPermission();

  const hasValidation = Boolean(settings.lastValidatedAt);
  setDiscoveryEnabled(configured && hasValidation);
  if (configured && hasValidation) {
    void runDiscovery(false);
  } else {
    setDiscoveryStatus('Validate to load configuration lists.');
  }
}

async function refreshPermission() {
  const normalized = normalizeBaseUrl(elements.baseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setPermission(normalized.error ?? 'Invalid base URL.', true);
    return;
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    setPermission('Permissions API not available.', true);
    return;
  }

  try {
    const granted = await ext.permissions.contains({ origins: [origin] });
    setPermission(
      granted ? `Permission granted for ${origin}` : `Permission missing for ${origin}`,
    );
  } catch (error) {
    setPermission((error as Error).message ?? 'Permission check failed.', true);
  }
}

async function refreshStashPermission() {
  const normalized = normalizeBaseUrl(elements.stashBaseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setStashPermission(normalized.error ?? 'Invalid base URL.', true);
    return;
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    setStashPermission('Permissions API not available.', true);
    return;
  }

  try {
    const granted = await ext.permissions.contains({ origins: [origin] });
    setStashPermission(
      granted ? `Permission granted for ${origin}` : `Permission missing for ${origin}`,
    );
  } catch (error) {
    setStashPermission((error as Error).message ?? 'Permission check failed.', true);
  }
}

async function requestPermission(): Promise<boolean> {
  const normalized = normalizeBaseUrl(elements.baseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setPermission(normalized.error ?? 'Invalid base URL.', true);
    return false;
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.request) {
    setPermission('Permissions API not available.', true);
    return false;
  }

  try {
    const granted = await ext.permissions.request({ origins: [origin] });
    if (!granted) {
      setPermission(
        `Permission required to access ${origin}. Grant permission to proceed.`,
        true,
      );
      return false;
    }
    setPermission(`Permission granted for ${origin}`);
    return true;
  } catch (error) {
    setPermission((error as Error).message ?? 'Permission request failed.', true);
    return false;
  }
}

async function requestStashPermission(): Promise<boolean> {
  const normalized = normalizeBaseUrl(elements.stashBaseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setStashPermission(normalized.error ?? 'Invalid base URL.', true);
    return false;
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.request) {
    setStashPermission('Permissions API not available.', true);
    return false;
  }

  try {
    const granted = await ext.permissions.request({ origins: [origin] });
    if (!granted) {
      setStashPermission(
        `Permission required to access ${origin}. Grant permission to proceed.`,
        true,
      );
      return false;
    }
    setStashPermission(`Permission granted for ${origin}`);
    return true;
  } catch (error) {
    setStashPermission((error as Error).message ?? 'Permission request failed.', true);
    return false;
  }
}

function setDiscoveryEnabled(enabled: boolean) {
  discoveryEnabled = enabled;
  elements.qualitySelect.disabled = !enabled;
  elements.rootSelect.disabled = !enabled;
  elements.labelsSelect.disabled = !enabled;
  elements.refresh.disabled = !enabled;
}

function resetSelect(select: HTMLSelectElement, placeholder: string) {
  select.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = placeholder;
  select.appendChild(option);
  select.value = '';
}

function updateQualityProfiles(
  items: NonNullable<FetchDiscoveryCatalogsResponse['catalogs']>['qualityProfiles'],
  selected: number | null,
  message?: string,
  isError = false,
) {
  resetSelect(elements.qualitySelect, 'Select a quality profile');
  for (const item of items) {
    const option = document.createElement('option');
    option.value = String(item.id);
    option.textContent = item.name;
    elements.qualitySelect.appendChild(option);
  }
  elements.qualitySelect.value = selected !== null ? String(selected) : '';

  if (message) {
    setSectionStatus(elements.qualityStatus, message, isError);
  } else if (items.length === 0) {
    setSectionStatus(elements.qualityStatus, 'No quality profiles found.');
  } else {
    setSectionStatus(elements.qualityStatus, 'Loaded.');
  }
}

function updateRootFolders(
  items: NonNullable<FetchDiscoveryCatalogsResponse['catalogs']>['rootFolders'],
  selected: string | null,
  message?: string,
  isError = false,
) {
  resetSelect(elements.rootSelect, 'Select a root folder');
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.path;
    option.textContent = item.path;
    elements.rootSelect.appendChild(option);
  }
  elements.rootSelect.value = selected ?? '';

  if (message) {
    setSectionStatus(elements.rootStatus, message, isError);
  } else if (items.length === 0) {
    setSectionStatus(elements.rootStatus, 'No root folders found.');
  } else {
    setSectionStatus(elements.rootStatus, 'Loaded.');
  }
}

function updateLabels(
  items: Array<{ id: number; label: string }>,
  selected: number[],
  message?: string,
  isError = false,
) {
  elements.labelsSelect.innerHTML = '';
  for (const item of items) {
    const option = document.createElement('option');
    option.value = String(item.id);
    option.textContent = item.label;
    option.selected = selected.includes(item.id);
    elements.labelsSelect.appendChild(option);
  }

  if (message) {
    setSectionStatus(elements.labelsStatus, message, isError);
  } else if (items.length === 0) {
    setSectionStatus(elements.labelsStatus, 'No labels found.');
  } else {
    setSectionStatus(elements.labelsStatus, 'Loaded.');
  }
}

function getLabels(
  catalogs: FetchDiscoveryCatalogsResponse['catalogs'],
): Array<{ id: number; label: string }> {
  if (!catalogs) return [];
  const value = (catalogs as unknown as Record<string, Array<{ id: number; label: string }>>)[
    labelKey
  ];
  return Array.isArray(value) ? value : [];
}

async function saveSelections() {
  if (!discoveryEnabled) {
    return;
  }

  const qualityProfileId = elements.qualitySelect.value
    ? Number(elements.qualitySelect.value)
    : null;
  const rootFolderPath = elements.rootSelect.value || null;
  const labelIds = Array.from(elements.labelsSelect.selectedOptions)
    .map((option) => Number(option.value))
    .filter((value) => Number.isFinite(value));

  const response = (await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.saveSelections,
    selections: {
      kind: 'whisparr',
      qualityProfileId,
      rootFolderPath,
      labelIds,
    },
  })) as SaveSelectionsResponse;

  if (!response.ok) {
    setDiscoveryStatus(response.error ?? 'Unable to save selections.', true);
    return;
  }

  if (response.selections) {
    currentSelections = response.selections;
  }
  setDiscoveryStatus('Selections saved.');
}

async function runDiscovery(force: boolean) {
  if (!discoveryEnabled) {
    return;
  }

  setDiscoveryStatus('Loading configuration lists...');
  setSectionStatus(elements.qualityStatus, 'Loading...');
  setSectionStatus(elements.rootStatus, 'Loading...');
  setSectionStatus(elements.labelsStatus, 'Loading...');

  const response = (await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.fetchDiscoveryCatalogs,
    kind: 'whisparr',
    force,
  })) as FetchDiscoveryCatalogsResponse;

  if (!response.ok) {
    setDiscoveryStatus(response.errors?.settings ?? 'Discovery failed.', true);
  }

  if (!response.catalogs) {
    setDiscoveryStatus('No catalogs available yet.', true);
    return;
  }

  const errors = response.errors;
  const labelError = errors
    ? (errors as Record<string, string | undefined>)[labelKey]
    : undefined;
  const selections = response.selections ?? currentSelections;
  currentSelections = selections;

  updateQualityProfiles(
    response.catalogs.qualityProfiles,
    selections.qualityProfileId ?? null,
    errors?.qualityProfiles,
    Boolean(errors?.qualityProfiles),
  );
  updateRootFolders(
    response.catalogs.rootFolders,
    selections.rootFolderPath ?? null,
    errors?.rootFolders,
    Boolean(errors?.rootFolders),
  );
  updateLabels(
    getLabels(response.catalogs),
    selections.labelIds ?? [],
    labelError,
    Boolean(labelError),
  );

  if (response.invalidSelections?.qualityProfileId) {
    setSectionStatus(elements.qualityStatus, 'Selection cleared (no longer available).', true);
  }
  if (response.invalidSelections?.rootFolderPath) {
    setSectionStatus(elements.rootStatus, 'Selection cleared (no longer available).', true);
  }
  if (response.invalidSelections?.labelsRemoved) {
    setSectionStatus(
      elements.labelsStatus,
      `Removed ${response.invalidSelections.labelsRemoved} unavailable label(s).`,
      true,
    );
  }

  const hasSectionErrors = Boolean(
    errors?.qualityProfiles || errors?.rootFolders || labelError,
  );
  if (errors?.permission) {
    setDiscoveryStatus(errors.permission, true);
  } else if (errors?.settings) {
    setDiscoveryStatus(errors.settings, true);
  } else if (hasSectionErrors) {
    setDiscoveryStatus('Lists loaded with some errors.', true);
  } else if (!errors || Object.keys(errors).length === 0) {
    setDiscoveryStatus('Lists loaded.');
  }
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
    lastValidatedAt: undefined,
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
  setDiscoveryEnabled(false);
  setDiscoveryStatus('Validate to load configuration lists.');
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
  setDiscoveryEnabled(true);
  void runDiscovery(true);
}

async function saveStashSettings() {
  const normalized = normalizeBaseUrl(elements.stashBaseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setStashStatus(normalized.error ?? 'Invalid base URL.', true);
    return;
  }

  const apiKey = elements.stashApiKey.value.trim();
  if (!apiKey) {
    setStashStatus('API key is required.', true);
    return;
  }

  const response = await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.saveSettings,
    settings: {
      stashBaseUrl: normalized.value,
      stashApiKey: apiKey,
    },
  });

  if (!response.ok) {
    setStashStatus(response.error ?? 'Save failed.', true);
    return;
  }

  setStashStatus('Settings saved.');
  await refreshStashPermission();
}

async function validateStashSettings() {
  setStashBusy(true);
  setStashStatus('Validating...', false);

  const normalized = normalizeBaseUrl(elements.stashBaseUrl.value);
  if (!normalized.ok || !normalized.value) {
    setStashStatus(normalized.error ?? 'Invalid base URL.', true);
    setStashBusy(false);
    return;
  }

  const apiKey = elements.stashApiKey.value.trim();
  if (!apiKey) {
    setStashStatus('API key is required.', true);
    setStashBusy(false);
    return;
  }

  const permitted = await requestStashPermission();
  if (!permitted) {
    setStashStatus('Permission required before validation.', true);
    setStashBusy(false);
    return;
  }

  const current = await ext.runtime.sendMessage({ type: MESSAGE_TYPES.getSettings });
  const previous = current.ok ? current.settings : undefined;

  await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.saveSettings,
    settings: {
      stashBaseUrl: normalized.value,
      stashApiKey: apiKey,
    },
  });

  const response = await ext.runtime.sendMessage({
    type: MESSAGE_TYPES.validateConnection,
    kind: 'stash',
  });

  if (!response.ok) {
    if (previous) {
      await ext.runtime.sendMessage({
        type: MESSAGE_TYPES.saveSettings,
        settings: {
          stashBaseUrl: previous.stashBaseUrl,
          stashApiKey: previous.stashApiKey,
        },
      });
    }
    const status = response.status ? ` (${response.status})` : '';
    setStashStatus(`Validation failed${status}: ${response.error ?? 'Unknown error'}`, true);
    setStashBusy(false);
    return;
  }

  setStashStatus(`Validated at ${new Date().toLocaleString()}`);
  setStashBusy(false);
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

elements.stashSave.addEventListener('click', () => {
  void saveStashSettings();
});

elements.stashValidate.addEventListener('click', () => {
  void validateStashSettings();
});

elements.stashReveal.addEventListener('click', () => {
  if (elements.stashApiKey.type === 'password') {
    elements.stashApiKey.type = 'text';
    elements.stashReveal.textContent = 'Hide';
  } else {
    elements.stashApiKey.type = 'password';
    elements.stashReveal.textContent = 'Show';
  }
});

elements.refresh.addEventListener('click', () => {
  void runDiscovery(true);
});

elements.qualitySelect.addEventListener('change', () => {
  void saveSelections();
});

elements.rootSelect.addEventListener('change', () => {
  void saveSelections();
});

elements.labelsSelect.addEventListener('change', () => {
  void saveSelections();
});

elements.baseUrl.addEventListener('input', () => {
  setDiscoveryEnabled(false);
  setDiscoveryStatus('Validate to load configuration lists.');
});

elements.apiKey.addEventListener('input', () => {
  setDiscoveryEnabled(false);
  setDiscoveryStatus('Validate to load configuration lists.');
});

elements.stashBaseUrl.addEventListener('input', () => {
  setStashStatus('Not configured.');
});

elements.stashApiKey.addEventListener('input', () => {
  setStashStatus('Not configured.');
});

void loadSettings();
