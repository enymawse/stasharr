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
  fetchDiscoveryCatalogs: 'FETCH_DISCOVERY_CATALOGS',
  saveSelections: 'SAVE_SELECTIONS',
  openOptionsPage: 'OPEN_OPTIONS_PAGE',
  checkSceneStatus: 'CHECK_SCENE_STATUS',
  updateTags: 'UPDATE_TAGS',
  updateQualityProfile: 'UPDATE_QUALITY_PROFILE',
  sceneCardActionRequested: 'SCENE_CARD_ACTION_REQUESTED',
  sceneCardsCheckStatus: 'SCENE_CARDS_CHECK_STATUS',
  sceneCardAdd: 'SCENE_CARD_ADD',
  sceneCardTriggerSearch: 'SCENE_CARD_TRIGGER_SEARCH',
  sceneCardSetExcluded: 'SCENE_CARD_SET_EXCLUDED',
  addScene: 'ADD_SCENE',
  setMonitorState: 'SET_MONITOR_STATE',
  stashFindSceneByStashdbId: 'STASH_FIND_SCENE_BY_STASHDB_ID',
} as const;

type ExtensionSettings = {
  whisparrBaseUrl: string;
  whisparrApiKey: string;
  stashBaseUrl?: string;
  stashApiKey?: string;
  lastValidatedAt?: string;
};

type DiscoveryCatalogs = {
  qualityProfiles: { id: number; name: string }[];
  rootFolders: { id?: number; path: string }[];
  tags: { id: number; label: string }[];
  fetchedAt?: string;
  baseUrl?: string;
  apiKeyHash?: string;
};

type DiscoverySelections = {
  qualityProfileId: number | null;
  rootFolderPath: string | null;
  tagIds: number[];
};

type DiscoverySelectionsForUi = {
  qualityProfileId: number | null;
  rootFolderPath: string | null;
  labelIds: number[];
};

type SceneCardStatusEntry = {
  exists: boolean;
  whisparrId?: number;
  monitored?: boolean;
  tagIds?: number[];
  hasFile?: boolean;
  excluded?: boolean;
  exclusionId?: number;
  fetchedAt: number;
};

const sceneCardStatusCache = new Map<string, SceneCardStatusEntry>();

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
    openOptionsPage?: () => void;
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
const CATALOGS_KEY = 'stasharrCatalogs';
const SELECTIONS_KEY = 'stasharrSelections';
const VERSION = '0.1.0';
const REQUEST_TIMEOUT_MS = 10_000;
const SCENE_CARD_STATUS_TTL_MS = 0;
const SCENE_CARD_STATUS_BATCH_LIMIT = 25;

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

async function getCatalogs(): Promise<{ whisparr: DiscoveryCatalogs }> {
  const result = await ext.storage.local.get(CATALOGS_KEY);
  return (result[CATALOGS_KEY] as { whisparr: DiscoveryCatalogs }) ?? {
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

async function saveCatalogs(partial: Partial<{ whisparr: DiscoveryCatalogs }>) {
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

async function getSelections(): Promise<{ whisparr: DiscoverySelections }> {
  const result = await ext.storage.local.get(SELECTIONS_KEY);
  return (result[SELECTIONS_KEY] as { whisparr: DiscoverySelections }) ?? {
    whisparr: {
      qualityProfileId: null,
      rootFolderPath: null,
      tagIds: [],
    },
  };
}

async function saveSelections(partial: Partial<{ whisparr: DiscoverySelections }>) {
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

function hashValue(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}`;
}

function toUiSelections(selections: DiscoverySelections): DiscoverySelectionsForUi {
  return {
    qualityProfileId: selections.qualityProfileId,
    rootFolderPath: selections.rootFolderPath,
    labelIds: selections.tagIds,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function stashGraphqlEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/graphql')) {
    return trimmed;
  }
  return `${trimmed}/graphql`;
}

async function stashGraphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: { message: string; status?: number; details?: unknown } }> {
  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.stashBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, error: { message: normalized.error ?? 'Invalid base URL.' } };
  }

  const apiKey = settings.stashApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, error: { message: 'API key is required.' } };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, error: { message: 'Permissions API not available.' } };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, error: { message: `Permission missing for ${origin}` } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(stashGraphqlEndpoint(normalized.value), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Stash GraphQL auth uses the ApiKey header (not X-Api-Key).
        ApiKey: apiKey,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      return {
        ok: false,
        error: {
          message: `JSON parse error: ${(error as Error).message}`,
          status: response.status,
        },
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: {
          message: `HTTP ${response.status}`,
          status: response.status,
          details: payload,
        },
      };
    }

    if (
      payload &&
      typeof payload === 'object' &&
      'errors' in payload &&
      Array.isArray((payload as { errors?: unknown }).errors)
    ) {
      const [firstError] = (payload as { errors: Array<{ message?: string }> }).errors;
      return {
        ok: false,
        error: {
          message: firstError?.message ?? 'GraphQL error',
          details: payload,
        },
      };
    }

    if (!payload || typeof payload !== 'object' || !('data' in payload)) {
      return { ok: false, error: { message: 'Missing GraphQL data in response.' } };
    }

    return { ok: true, data: (payload as { data: T }).data };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { ok: false, error: { message: 'Request timed out.' } };
    }
    return { ok: false, error: { message: `Network error: ${(error as Error).message}` } };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleValidateConnection(request: { baseUrl?: string; apiKey?: string; kind?: string }) {
  if (request.kind === 'stash') {
    const query = `
      query StasharrSystemStatus {
        systemStatus {
          status
        }
      }
    `;
    const result = await stashGraphqlRequest<{ systemStatus?: { status?: string } }>(
      query,
    );
    if (!result.ok) {
      return {
        ok: false,
        type: MESSAGE_TYPES.validateConnection,
        status: result.error.status,
        error: result.error.message,
        data: result.error.details,
      };
    }

    if (!result.data?.systemStatus) {
      return {
        ok: false,
        type: MESSAGE_TYPES.validateConnection,
        error: 'Unexpected response payload.',
      };
    }

    return {
      ok: true,
      type: MESSAGE_TYPES.validateConnection,
      data: result.data,
    };
  }

  const normalized = normalizeBaseUrl(request.baseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  if (!request.apiKey?.trim()) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: 'API key is required.',
    };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/system/status`,
    headers: { 'X-Api-Key': request.apiKey.trim() },
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

async function fetchQualityProfiles(baseUrl: string, apiKey: string) {
  const response = await handleFetchJson({
    url: `${normalizedBaseUrl(baseUrl)}/api/v3/qualityprofile`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return { items: [], error: response.error ?? 'Quality profiles request failed.' };
  }

  if (!Array.isArray(response.json)) {
    return { items: [], error: 'Unexpected quality profiles response.' };
  }

  const items = response.json
    .filter(isRecord)
    .map((item) => {
      const id = Number(item.id);
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!Number.isFinite(id) || !name) return null;
      return { id, name };
    })
    .filter((item): item is { id: number; name: string } => Boolean(item));

  return { items };
}

async function fetchRootFolders(baseUrl: string, apiKey: string) {
  const response = await handleFetchJson({
    url: `${normalizedBaseUrl(baseUrl)}/api/v3/rootfolder`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return { items: [], error: response.error ?? 'Root folders request failed.' };
  }

  if (!Array.isArray(response.json)) {
    return { items: [], error: 'Unexpected root folders response.' };
  }

  const items = response.json
    .filter(isRecord)
    .map((item) => {
      const id =
        typeof item.id === 'number' || typeof item.id === 'string'
          ? Number(item.id)
          : undefined;
      const path = typeof item.path === 'string' ? item.path.trim() : '';
      if (!path) return null;
      return Number.isFinite(id ?? NaN) ? { id: id as number, path } : { path };
    })
    .filter((item): item is { id?: number; path: string } => Boolean(item));

  return { items };
}

async function fetchTags(baseUrl: string, apiKey: string) {
  const response = await handleFetchJson({
    url: `${normalizedBaseUrl(baseUrl)}/api/v3/tag`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return { items: [], error: response.error ?? 'Tags request failed.' };
  }

  if (!Array.isArray(response.json)) {
    return { items: [], error: 'Unexpected tags response.' };
  }

  const items = response.json
    .filter(isRecord)
    .map((item) => {
      const id = Number(item.id);
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!Number.isFinite(id) || !label) return null;
      return { id, label };
    })
    .filter((item): item is { id: number; label: string } => Boolean(item));

  return { items };
}

function normalizedBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizeTags(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => Number(tag))
    .filter((tag) => Number.isFinite(tag));
}

function buildUpdatePayload(
  existing: Record<string, unknown>,
  overrides: { id: number; monitored?: boolean; tags?: number[]; qualityProfileId?: number },
): { payload?: Record<string, unknown>; error?: string } {
  const { id, ...rest } = overrides;
  const qualityProfileId = Number(existing.qualityProfileId);
  const rootFolderPath =
    typeof existing.rootFolderPath === 'string' ? existing.rootFolderPath : '';
  const path = typeof existing.path === 'string' ? existing.path : undefined;
  if (!Number.isFinite(qualityProfileId) || !rootFolderPath) {
    return { error: 'Whisparr scene missing required fields.' };
  }

  return {
    payload: {
      id,
      monitored: Boolean(existing.monitored),
      qualityProfileId,
      rootFolderPath,
      tags: normalizeTags(existing.tags),
      title: typeof existing.title === 'string' ? existing.title : undefined,
      year: Number.isFinite(Number(existing.year)) ? Number(existing.year) : undefined,
      path,
      ...rest,
    },
  };
}

async function fetchSceneLookup(baseUrl: string, apiKey: string, stashId: string) {
  const response = await handleFetchJson({
    url: `${baseUrl}/api/v3/lookup/scene?term=stash:${encodeURIComponent(stashId)}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return { error: response.error ?? 'Lookup failed.' };
  }

  if (!Array.isArray(response.json) || response.json.length === 0) {
    return { error: 'Scene not found in lookup.' };
  }

  const first = response.json.find(isRecord);
  if (!first || !isRecord(first.movie)) {
    return { error: 'Lookup payload missing movie.' };
  }

  return { scene: first.movie };
}

function reconcileSelections(catalogs: DiscoveryCatalogs, selections: DiscoverySelections) {
  const invalid: { qualityProfileId?: boolean; rootFolderPath?: boolean; labelsRemoved?: number } = {};
  const next: DiscoverySelections = {
    qualityProfileId: selections.qualityProfileId,
    rootFolderPath: selections.rootFolderPath,
    tagIds: [...selections.tagIds],
  };

  if (
    next.qualityProfileId !== null &&
    !catalogs.qualityProfiles.some((profile) => profile.id === next.qualityProfileId)
  ) {
    next.qualityProfileId = null;
    invalid.qualityProfileId = true;
  }

  if (
    next.rootFolderPath !== null &&
    !catalogs.rootFolders.some((folder) => folder.path === next.rootFolderPath)
  ) {
    next.rootFolderPath = null;
    invalid.rootFolderPath = true;
  }

  if (next.tagIds.length > 0) {
    const allowed = new Set(catalogs.tags.map((item) => item.id));
    const filtered = next.tagIds.filter((id) => allowed.has(id));
    if (filtered.length !== next.tagIds.length) {
      invalid.labelsRemoved = next.tagIds.length - filtered.length;
      next.tagIds = filtered;
    }
  }

  return { next, invalid };
}

async function handleFetchDiscoveryCatalogs(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.fetchDiscoveryCatalogs) {
    return {
      ok: false,
      type: MESSAGE_TYPES.fetchDiscoveryCatalogs,
      errors: { settings: 'Invalid request type.' },
    };
  }

  if (request.kind !== 'whisparr') {
    return {
      ok: false,
      type: MESSAGE_TYPES.fetchDiscoveryCatalogs,
      errors: { settings: 'Unsupported discovery kind.' },
    };
  }

  const errors: { qualityProfiles?: string; rootFolders?: string; tags?: string; permission?: string; settings?: string } = {};
  const settings = await getSettings();
  const baseUrlRaw = (request.baseUrl as string | undefined) ?? settings.whisparrBaseUrl;
  const apiKeyRaw = (request.apiKey as string | undefined) ?? settings.whisparrApiKey;
  const normalized = normalizeBaseUrl(baseUrlRaw ?? '');

  if (!normalized.ok || !normalized.value) {
    errors.settings = normalized.error ?? 'Invalid base URL.';
  }

  const apiKey = apiKeyRaw?.trim() ?? '';
  if (!apiKey) {
    errors.settings = errors.settings ?? 'API key is required.';
  }

  const catalogsState = await getCatalogs();
  const selectionsState = await getSelections();
  const cached = catalogsState.whisparr;

  if (!errors.settings && normalized.value) {
    const origin = hostOriginPattern(normalized.value);
    if (!ext.permissions?.contains) {
      errors.permission = 'Permissions API not available.';
    } else {
      try {
        const granted = await ext.permissions.contains({ origins: [origin] });
        if (!granted) {
          errors.permission = `Permission missing for ${origin}`;
        }
      } catch (error) {
        errors.permission = (error as Error).message;
      }
    }
  }

  const catalogsForUi: DiscoveryCatalogs = {
    qualityProfiles: cached.qualityProfiles ?? [],
    rootFolders: cached.rootFolders ?? [],
    tags: cached.tags ?? [],
    fetchedAt: cached.fetchedAt,
  };

  if (!errors.settings && !errors.permission && normalized.value) {
    const apiKeyHash = hashValue(apiKey);
    const shouldFetch =
      Boolean(request.force) ||
      cached.baseUrl !== normalized.value ||
      cached.apiKeyHash !== apiKeyHash ||
      !cached.fetchedAt;

    if (shouldFetch) {
      const [qualityResult, rootResult, tagsResult] = await Promise.all([
        fetchQualityProfiles(normalized.value, apiKey),
        fetchRootFolders(normalized.value, apiKey),
        fetchTags(normalized.value, apiKey),
      ]);

      if (qualityResult.error) {
        errors.qualityProfiles = qualityResult.error;
      }
      if (rootResult.error) {
        errors.rootFolders = rootResult.error;
      }
      if (tagsResult.error) {
        errors.tags = tagsResult.error;
      }

      catalogsForUi.qualityProfiles = qualityResult.error
        ? cached.qualityProfiles
        : qualityResult.items;
      catalogsForUi.rootFolders = rootResult.error ? cached.rootFolders : rootResult.items;
      catalogsForUi.tags = tagsResult.error ? cached.tags : tagsResult.items;
      catalogsForUi.fetchedAt = new Date().toISOString();

      await saveCatalogs({
        whisparr: {
          ...catalogsForUi,
          baseUrl: normalized.value,
          apiKeyHash,
        },
      });
    }
  }

  const reconciled = reconcileSelections(catalogsForUi, selectionsState.whisparr);
  if (
    reconciled.next.qualityProfileId !== selectionsState.whisparr.qualityProfileId ||
    reconciled.next.rootFolderPath !== selectionsState.whisparr.rootFolderPath ||
    reconciled.next.tagIds.join(',') !== selectionsState.whisparr.tagIds.join(',')
  ) {
    await saveSelections({ whisparr: reconciled.next });
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.fetchDiscoveryCatalogs,
    catalogs: catalogsForUi,
    selections: toUiSelections(reconciled.next),
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    invalidSelections:
      reconciled.invalid && Object.keys(reconciled.invalid).length > 0
        ? reconciled.invalid
        : undefined,
  };
}

async function handleSaveSelections(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.saveSelections) {
    return { ok: false, type: MESSAGE_TYPES.saveSelections, error: 'Invalid request type.' };
  }

  const selections = request.selections as {
    kind?: string;
    qualityProfileId?: number | null;
    rootFolderPath?: string | null;
    labelIds?: number[];
  };

  if (selections?.kind !== 'whisparr') {
    return { ok: false, type: MESSAGE_TYPES.saveSelections, error: 'Unsupported selection kind.' };
  }

  const catalogsState = await getCatalogs();
  const catalogs = catalogsState.whisparr;
  const qualityProfileId = selections.qualityProfileId ?? null;
  const rootFolderPath = selections.rootFolderPath ?? null;
  const labelIds = selections.labelIds ?? [];

  const next: DiscoverySelections = {
    qualityProfileId:
      qualityProfileId !== null &&
      catalogs.qualityProfiles.some((item) => item.id === qualityProfileId)
        ? qualityProfileId
        : null,
    rootFolderPath:
      rootFolderPath !== null &&
      catalogs.rootFolders.some((item) => item.path === rootFolderPath)
        ? rootFolderPath
        : null,
    tagIds: labelIds.filter((id) => catalogs.tags.some((item) => item.id === id)),
  };

  const saved = await saveSelections({ whisparr: next });
  return { ok: true, type: MESSAGE_TYPES.saveSelections, selections: toUiSelections(saved.whisparr) };
}

async function handleCheckSceneStatus(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.checkSceneStatus) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: 'Invalid request type.' };
  }

  const stashId = String(request.stashdbSceneId ?? '').trim();
  if (!stashId) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: 'Scene ID is required.' };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: `Permission missing for ${origin}` };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie?stashId=${encodeURIComponent(stashId)}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: response.error ?? 'Lookup failed.' };
  }

  if (!Array.isArray(response.json)) {
    return { ok: false, type: MESSAGE_TYPES.checkSceneStatus, exists: false, error: 'Unexpected response payload.' };
  }

  const first = response.json.find(isRecord);
  if (!first) {
    const excluded = await fetchExclusionState(normalized.value, apiKey, stashId);
    return { ok: true, type: MESSAGE_TYPES.checkSceneStatus, exists: false, excluded: excluded.excluded };
  }

  const whisparrId = Number(first.id);
  const title = typeof first.title === 'string' ? first.title : undefined;
  const hasFile = typeof first.hasFile === 'boolean' ? first.hasFile : undefined;
  const monitored = typeof first.monitored === 'boolean' ? first.monitored : undefined;
  const tagIds = normalizeTags(first.tags);
  const qualityProfileId = Number(first.qualityProfileId);

  return {
    ok: true,
    type: MESSAGE_TYPES.checkSceneStatus,
    exists: true,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
    title,
    hasFile,
    monitored,
    tagIds,
    qualityProfileId: Number.isFinite(qualityProfileId) ? qualityProfileId : undefined,
    excluded: false,
  };
}

async function handleAddScene(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.addScene) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Invalid request type.' };
  }

  const stashId = String(request.stashdbSceneId ?? '').trim();
  if (!stashId) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Scene ID is required.' };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: `Permission missing for ${origin}` };
  }

  const selections = await getSelections();
  const qualityProfileId = selections.whisparr.qualityProfileId;
  const rootFolderPath = selections.whisparr.rootFolderPath;
  if (!qualityProfileId || !rootFolderPath) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Missing quality profile or root folder selection.' };
  }

  const lookup = await fetchSceneLookup(normalized.value, apiKey, stashId);
  if (!lookup.scene) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: lookup.error ?? 'Lookup failed.' };
  }

  const foreignId = typeof lookup.scene.foreignId === 'string' ? lookup.scene.foreignId : `stash:${stashId}`;
  const title = typeof lookup.scene.title === 'string' ? lookup.scene.title : undefined;

  const payload = {
    foreignId,
    title,
    qualityProfileId,
    rootFolderPath,
    tags: selections.whisparr.tagIds ?? [],
    searchForMovie: true,
  };

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie`,
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Unauthorized (check API key).' };
    }
    if (status === 400) {
      return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Validation failed (check selections).' };
    }
    return { ok: false, type: MESSAGE_TYPES.addScene, error: response.error ?? `HTTP ${status}` };
  }

  if (!isRecord(response.json)) {
    return { ok: false, type: MESSAGE_TYPES.addScene, error: 'Unexpected response payload.' };
  }

  const whisparrId = Number(response.json.id);
  return {
    ok: true,
    type: MESSAGE_TYPES.addScene,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
  };
}

async function handleSetMonitorState(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.setMonitorState) {
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: false, error: 'Invalid request type.' };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: false, error: 'Whisparr ID is required.' };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: false, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: false, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: false, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: false, error: `Permission missing for ${origin}` };
  }

  const existingResponse = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: Boolean(request.monitored),
      error: existingResponse.error ?? 'Failed to fetch Whisparr scene.',
    };
  }

  const existing = existingResponse.json as Record<string, unknown>;
  const build = buildUpdatePayload(existing, {
    id: whisparrId,
    monitored: Boolean(request.monitored),
  });
  if (!build.payload) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: Boolean(request.monitored),
      error: build.error ?? 'Whisparr scene missing required fields.',
    };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    method: 'PUT',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(build.payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: Boolean(request.monitored), error: 'Unauthorized (check API key).' };
    }
    if (status === 400) {
      return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: Boolean(request.monitored), error: 'Validation failed.' };
    }
    return { ok: false, type: MESSAGE_TYPES.setMonitorState, monitored: Boolean(request.monitored), error: response.error ?? `HTTP ${status}` };
  }

  return { ok: true, type: MESSAGE_TYPES.setMonitorState, monitored: Boolean(request.monitored) };
}

async function handleUpdateTags(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.updateTags) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: 'Invalid request type.' };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: 'Whisparr ID is required.' };
  }

  const tagIds = normalizeTags(request.tagIds);

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: `Permission missing for ${origin}` };
  }

  const existingResponse = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: existingResponse.error ?? 'Failed to fetch Whisparr scene.' };
  }

  const build = buildUpdatePayload(existingResponse.json as Record<string, unknown>, {
    id: whisparrId,
    tags: tagIds,
  });
  if (!build.payload) {
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: build.error ?? 'Whisparr scene missing required fields.' };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    method: 'PUT',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(build.payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return { ok: false, type: MESSAGE_TYPES.updateTags, error: 'Unauthorized (check API key).' };
    }
    if (status === 400) {
      return { ok: false, type: MESSAGE_TYPES.updateTags, error: 'Validation failed (check tags).' };
    }
    return { ok: false, type: MESSAGE_TYPES.updateTags, error: response.error ?? `HTTP ${status}` };
  }

  return { ok: true, type: MESSAGE_TYPES.updateTags, tagIds };
}

async function handleUpdateQualityProfile(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.updateQualityProfile) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'Invalid request type.' };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'Whisparr ID is required.' };
  }

  const qualityProfileId = Number(request.qualityProfileId);
  if (!Number.isFinite(qualityProfileId) || qualityProfileId <= 0) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'Quality profile is required.' };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: `Permission missing for ${origin}` };
  }

  const existingResponse = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: existingResponse.error ?? 'Failed to fetch Whisparr scene.' };
  }

  const build = buildUpdatePayload(existingResponse.json as Record<string, unknown>, {
    id: whisparrId,
    qualityProfileId,
  });
  if (!build.payload) {
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: build.error ?? 'Whisparr scene missing required fields.' };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    method: 'PUT',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(build.payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'Unauthorized (check API key).' };
    }
    if (status === 400) {
      return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: 'Validation failed (check profile).' };
    }
    return { ok: false, type: MESSAGE_TYPES.updateQualityProfile, error: response.error ?? `HTTP ${status}` };
  }

  return { ok: true, type: MESSAGE_TYPES.updateQualityProfile, qualityProfileId };
}

async function handleSceneCardAction(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.sceneCardActionRequested) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardActionRequested, error: 'Invalid request type.' };
  }

  const sceneId = String(request.sceneId ?? '').trim();
  const sceneUrl = String(request.sceneUrl ?? '').trim();
  if (!sceneId || !sceneUrl) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardActionRequested, error: 'Scene ID and URL are required.' };
  }

  return { ok: true, type: MESSAGE_TYPES.sceneCardActionRequested };
}

async function handleSceneCardsCheckStatus(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.sceneCardsCheckStatus) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardsCheckStatus, error: 'Invalid request type.' };
  }

  const items = Array.isArray(request.items) ? request.items : [];
  if (items.length === 0) {
    return { ok: true, type: MESSAGE_TYPES.sceneCardsCheckStatus, results: [] };
  }

  const uniqueItems = new Map<string, { sceneId: string; sceneUrl: string }>();
  for (const item of items.slice(0, SCENE_CARD_STATUS_BATCH_LIMIT)) {
    const sceneId = typeof item?.sceneId === 'string' ? item.sceneId.trim() : '';
    const sceneUrl = typeof item?.sceneUrl === 'string' ? item.sceneUrl.trim() : '';
    if (!sceneId || !sceneUrl) continue;
    uniqueItems.set(sceneId, { sceneId, sceneUrl });
  }

  const now = Date.now();
  const results: Array<{
    sceneId: string;
    exists: boolean;
    whisparrId?: number;
    monitored?: boolean;
    tagIds?: number[];
    hasFile?: boolean;
    excluded?: boolean;
  }> = [];

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardsCheckStatus, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardsCheckStatus, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardsCheckStatus, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardsCheckStatus, error: `Permission missing for ${origin}` };
  }

  for (const sceneId of uniqueItems.keys()) {
    const response = await handleFetchJson({
      url: `${normalized.value}/api/v3/movie?stashId=${encodeURIComponent(sceneId)}`,
      headers: { 'X-Api-Key': apiKey },
    });

    if (!response.ok) {
      results.push({ sceneId, exists: false });
      continue;
    }

    if (!Array.isArray(response.json)) {
      results.push({ sceneId, exists: false });
      continue;
    }

    const first = response.json.find(isRecord);
    if (!first) {
      const excluded = await fetchExclusionState(normalized.value, apiKey, sceneId);
      sceneCardStatusCache.set(sceneId, {
        exists: false,
        excluded: excluded.excluded,
        exclusionId: excluded.exclusionId,
        fetchedAt: now,
      });
      results.push({ sceneId, exists: false, excluded: excluded.excluded });
      continue;
    }

    const whisparrId = Number(first.id);
    const monitored = typeof first.monitored === 'boolean' ? first.monitored : undefined;
    const tagIds = normalizeTags(first.tags);
    const hasFile =
      typeof first.hasFile === 'boolean'
        ? first.hasFile
        : typeof first.movieFileId === 'number'
          ? first.movieFileId > 0
          : isRecord(first.movieFile)
            ? true
            : isRecord(first.statistics) && typeof first.statistics.movieFileCount === 'number'
              ? first.statistics.movieFileCount > 0
              : typeof first.fileCount === 'number'
                ? first.fileCount > 0
                : undefined;
    const excluded = typeof monitored === 'boolean' ? !monitored : undefined;
    const entry: SceneCardStatusEntry = {
      exists: true,
      whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
      monitored,
      tagIds,
      hasFile,
      excluded,
      fetchedAt: now,
    };
    sceneCardStatusCache.set(sceneId, entry);
    results.push({
      sceneId,
      exists: entry.exists,
      whisparrId: entry.whisparrId,
      monitored: entry.monitored,
      tagIds: entry.tagIds,
      hasFile: entry.hasFile,
      excluded: entry.excluded,
    });
  }

  return { ok: true, type: MESSAGE_TYPES.sceneCardsCheckStatus, results };
}

async function handleSceneCardAdd(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.sceneCardAdd) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'Invalid request type.' };
  }

  const sceneId = typeof request.sceneId === 'string' ? request.sceneId.trim() : '';
  const sceneUrl = typeof request.sceneUrl === 'string' ? request.sceneUrl.trim() : '';
  if (!sceneId || !sceneUrl) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'Scene ID and URL are required.' };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: normalized.error ?? 'Invalid base URL.' };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'API key is required.' };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'Permissions API not available.' };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: `Permission missing for ${origin}` };
  }

  const selections = await getSelections();
  const qualityProfileId = selections.whisparr.qualityProfileId;
  const rootFolderPath = selections.whisparr.rootFolderPath;
  if (!qualityProfileId || !rootFolderPath) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'Missing quality profile or root folder selection.' };
  }

  const lookup = await fetchSceneLookup(normalized.value, apiKey, sceneId);
  if (!lookup.scene) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: lookup.error ?? 'Lookup failed.' };
  }

  const foreignId = typeof lookup.scene.foreignId === 'string' ? lookup.scene.foreignId : `stash:${sceneId}`;
  const title = typeof lookup.scene.title === 'string' ? lookup.scene.title : undefined;

  const payload = {
    qualityProfileId,
    rootFolderPath,
    tags: selections.whisparr.tagIds ?? [],
    searchForMovie: true,
    foreignId,
    title,
  };

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/movie`,
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401 || status === 403) {
      return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'Unauthorized (check API key).' };
    }
    if (status === 400) {
      return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: 'Validation failed (check selections).' };
    }
    return { ok: false, type: MESSAGE_TYPES.sceneCardAdd, error: response.error ?? `HTTP ${status}` };
  }

  const whisparrId = response.json && isRecord(response.json) ? Number(response.json.id) : undefined;
  sceneCardStatusCache.set(sceneId, {
    exists: true,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
    monitored: response.json && isRecord(response.json) && typeof response.json.monitored === 'boolean' ? response.json.monitored : undefined,
    tagIds: response.json && isRecord(response.json) ? normalizeTags(response.json.tags) : undefined,
    fetchedAt: Date.now(),
  });

  return { ok: true, type: MESSAGE_TYPES.sceneCardAdd, whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined };
}

async function handleSceneCardTriggerSearch(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.sceneCardTriggerSearch) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'invalid_request', message: 'Invalid request type.' } };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'missing_id', message: 'Whisparr ID is required.' } };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'invalid_base_url', message: normalized.error ?? 'Invalid base URL.' } };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'missing_key', message: 'API key is required.' } };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'no_permissions', message: 'Permissions API not available.' } };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'permission_missing', message: `Permission missing for ${origin}` } };
  }

  const response = await handleFetchJson({
    url: `${normalized.value}/api/v3/command`,
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'MoviesSearch', movieIds: [whisparrId] }),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401 || status === 403) {
      return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'unauthorized', message: 'Unauthorized (check API key).' } };
    }
    if (status === 400) {
      return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: 'validation', message: 'Validation failed (check Whisparr item).' } };
    }
    return { ok: false, type: MESSAGE_TYPES.sceneCardTriggerSearch, error: { code: `http_${status}`, message: response.error ?? `HTTP ${status}` } };
  }

  return { ok: true, type: MESSAGE_TYPES.sceneCardTriggerSearch };
}

async function handleSceneCardSetExcluded(request: { type?: string; [key: string]: unknown }) {
  if (request.type !== MESSAGE_TYPES.sceneCardSetExcluded) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'invalid_request', message: 'Invalid request type.' } };
  }

  const sceneId = typeof request.sceneId === 'string' ? request.sceneId.trim() : '';
  const movieTitle = typeof request.movieTitle === 'string' ? request.movieTitle.trim() : '';
  const movieYear = Number.isFinite(Number(request.movieYear)) ? Number(request.movieYear) : undefined;
  const excluded = Boolean(request.excluded);
  if (!sceneId) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'missing_id', message: 'Scene ID is required.' } };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'invalid_base_url', message: normalized.error ?? 'Invalid base URL.' } };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'missing_key', message: 'API key is required.' } };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'no_permissions', message: 'Permissions API not available.' } };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'permission_missing', message: `Permission missing for ${origin}` } };
  }

  const existing = await fetchExclusionState(normalized.value, apiKey, sceneId);
  if (excluded && existing.excluded) {
    return { ok: true, type: MESSAGE_TYPES.sceneCardSetExcluded, excluded: true };
  }
  if (!excluded && !existing.excluded) {
    return { ok: true, type: MESSAGE_TYPES.sceneCardSetExcluded, excluded: false };
  }

  let createdExclusionId: number | undefined;
  if (excluded) {
    const createResponse = await handleFetchJson({
      url: `${normalized.value}/api/v3/exclusions`,
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foreignId: sceneId,
        movieTitle: movieTitle || sceneId,
        movieYear: movieYear ?? 1,
      }),
    });

    if (!createResponse.ok) {
      const status = createResponse.status ?? 0;
      if (status === 401 || status === 403) {
        return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'unauthorized', message: 'Unauthorized (check API key).' } };
      }
      if (status === 400) {
        return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'validation', message: 'Validation failed (check exclusion).' } };
      }
      return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: `http_${status}`, message: createResponse.error ?? `HTTP ${status}` } };
    }
    if (createResponse.json && isRecord(createResponse.json)) {
      const parsedId = Number(createResponse.json.id);
      createdExclusionId = Number.isFinite(parsedId) ? parsedId : undefined;
    }
  } else if (existing.exclusionId) {
    const deleteResponse = await handleFetchJson({
      url: `${normalized.value}/api/v3/exclusions/${existing.exclusionId}`,
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey },
    });

    if (!deleteResponse.ok) {
      const status = deleteResponse.status ?? 0;
      if (status === 401 || status === 403) {
        return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: 'unauthorized', message: 'Unauthorized (check API key).' } };
      }
      return { ok: false, type: MESSAGE_TYPES.sceneCardSetExcluded, error: { code: `http_${status}`, message: deleteResponse.error ?? `HTTP ${status}` } };
    }
  }

  const cached = sceneCardStatusCache.get(sceneId);
  sceneCardStatusCache.set(sceneId, {
    exists: cached?.exists ?? false,
    whisparrId: cached?.whisparrId,
    monitored: cached?.monitored,
    tagIds: cached?.tagIds,
    hasFile: cached?.hasFile,
    excluded,
    exclusionId: excluded ? existing.exclusionId ?? createdExclusionId : undefined,
    fetchedAt: Date.now(),
  });

  return { ok: true, type: MESSAGE_TYPES.sceneCardSetExcluded, excluded };
}

async function fetchExclusionState(baseUrl: string, apiKey: string, sceneId: string) {
  const response = await handleFetchJson({
    url: `${baseUrl}/api/v3/exclusions?stashId=${encodeURIComponent(sceneId)}`,
    headers: { 'X-Api-Key': apiKey },
  });
  if (!response.ok || !Array.isArray(response.json)) {
    return { excluded: false, exclusionId: undefined as number | undefined };
  }
  const match = response.json.find(isRecord);
  if (!match) {
    return { excluded: false, exclusionId: undefined as number | undefined };
  }
  const exclusionId = Number(match.id);
  return { excluded: true, exclusionId: Number.isFinite(exclusionId) ? exclusionId : undefined };
}

async function handleStashFindSceneByStashdbId(request: { stashdbSceneId?: string }) {
  const stashdbSceneId = request.stashdbSceneId?.trim();
  if (!stashdbSceneId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
      error: 'StashDB scene ID is required.',
    };
  }

  const query = `
    query StasharrFindSceneByStashId($stashId: String!) {
      findScenes(
        scene_filter: {
          stash_id_endpoint: { stash_id: $stashId }
        }
        filter: { per_page: 1 }
      ) {
        scenes {
          id
          title
          path
        }
      }
    }
  `;

  const result = await stashGraphqlRequest<{
    findScenes?: { scenes?: Array<{ id?: string | number; title?: string; path?: string }> };
  }>(query, { stashId: stashdbSceneId });

  if (!result.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
      error: result.error.message,
    };
  }

  const scene = result.data.findScenes?.scenes?.[0];
  if (!scene) {
    return {
      ok: true,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.stashFindSceneByStashdbId,
    found: true,
    stashSceneId: scene.id,
    stashScenePath: scene.path,
    title: scene.title,
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
      return handleValidateConnection(
        request as { baseUrl?: string; apiKey?: string; kind?: string },
      );
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

    if (request?.type === MESSAGE_TYPES.fetchDiscoveryCatalogs) {
      return handleFetchDiscoveryCatalogs(request);
    }

    if (request?.type === MESSAGE_TYPES.saveSelections) {
      return handleSaveSelections(request);
    }

    if (request?.type === MESSAGE_TYPES.checkSceneStatus) {
      return handleCheckSceneStatus(request);
    }

    if (request?.type === MESSAGE_TYPES.addScene) {
      return handleAddScene(request);
    }

    if (request?.type === MESSAGE_TYPES.setMonitorState) {
      return handleSetMonitorState(request);
    }

    if (request?.type === MESSAGE_TYPES.updateTags) {
      return handleUpdateTags(request);
    }

    if (request?.type === MESSAGE_TYPES.updateQualityProfile) {
      return handleUpdateQualityProfile(request);
    }

    if (request?.type === MESSAGE_TYPES.sceneCardActionRequested) {
      return handleSceneCardAction(request);
    }

    if (request?.type === MESSAGE_TYPES.sceneCardsCheckStatus) {
      return handleSceneCardsCheckStatus(request);
    }

    if (request?.type === MESSAGE_TYPES.sceneCardAdd) {
      return handleSceneCardAdd(request);
    }

    if (request?.type === MESSAGE_TYPES.sceneCardTriggerSearch) {
      return handleSceneCardTriggerSearch(request);
    }

    if (request?.type === MESSAGE_TYPES.sceneCardSetExcluded) {
      return handleSceneCardSetExcluded(request);
    }

    if (request?.type === MESSAGE_TYPES.stashFindSceneByStashdbId) {
      return handleStashFindSceneByStashdbId(request as { stashdbSceneId?: string });
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

    if (request?.type === MESSAGE_TYPES.openOptionsPage) {
      if (ext.runtime.openOptionsPage) {
        ext.runtime.openOptionsPage();
        return { ok: true, type: MESSAGE_TYPES.openOptionsPage };
      }
      return { ok: false, type: MESSAGE_TYPES.openOptionsPage, error: 'openOptionsPage not available.' };
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
