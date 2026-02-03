import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type ExtensionResponse,
  type FetchJsonResponse,
  type FetchDiscoveryCatalogsResponse,
  type SaveSelectionsResponse,
  type DiscoveryCatalogs,
  type DiscoverySelections,
  type DiscoverySelectionsForUi,
  type ValidateConnectionResponse,
  type CheckSceneStatusResponse,
  type AddSceneResponse,
  type SetMonitorStateResponse,
  type UpdateTagsResponse,
  type UpdateQualityProfileResponse,
} from '../shared/messages.js';
import {
  getCatalogs,
  getSelections,
  getSettings,
  resetSettings,
  saveCatalogs,
  saveSelections,
  saveSettings,
} from '../shared/storage.js';

const MESSAGE_TYPES_BG = MESSAGE_TYPES;

type ExtRuntimeBg = {
  runtime: {
    onMessage: {
      addListener: (
        callback: (
          request: ExtensionRequest,
          sender: unknown,
          sendResponse: (response: ExtensionResponse) => void,
        ) => void,
      ) => void;
    };
    openOptionsPage?: () => void;
  };
  permissions?: {
    request: (details: { origins: string[] }) => Promise<boolean>;
    contains: (details: { origins: string[] }) => Promise<boolean>;
  };
};

const extCandidate =
  (
    globalThis as typeof globalThis & {
      browser?: ExtRuntimeBg;
      chrome?: ExtRuntimeBg;
    }
  ).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtRuntimeBg }).chrome;

if (!extCandidate) {
  throw new Error('Extension runtime not available.');
}
const ext = extCandidate;
const VERSION = '0.1.0';
const REQUEST_TIMEOUT_MS = 10_000;

type DiscoveryErrors = {
  qualityProfiles?: string;
  rootFolders?: string;
  tags?: string;
  permission?: string;
  settings?: string;
};

type AddScenePayload = {
  qualityProfileId: number;
  rootFolderPath: string;
  tags: number[];
  searchForMovie: boolean;
  foreignId: string;
  title?: string;
};

type UpdateScenePayload = {
  id: number;
  monitored: boolean;
  qualityProfileId: number;
  rootFolderPath: string;
  tags?: number[];
  title?: string;
  year?: number;
  path?: string;
};

async function handleFetchJson(
  request: ExtensionRequest,
): Promise<FetchJsonResponse> {
  if (request.type !== MESSAGE_TYPES_BG.fetchJson) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.fetchJson,
      error: 'Invalid request type',
    };
  }

  const { url, method, headers, body } = request;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.debug('[stasharr][background] fetch', {
      url,
      isServiceWorker: typeof window === 'undefined',
    });
    const response = await fetch(url, {
      method: method ?? 'GET',
      headers,
      body,
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
          type: MESSAGE_TYPES_BG.fetchJson,
          status: response.status,
          error: `JSON parse error: ${(error as Error).message}`,
        };
      }
    } else {
      text = await response.text();
    }

    return {
      ok: response.ok,
      type: MESSAGE_TYPES_BG.fetchJson,
      status: response.status,
      json,
      text,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { ok: false, type: MESSAGE_TYPES_BG.fetchJson, error: 'Timeout' };
    }

    return {
      ok: false,
      type: MESSAGE_TYPES_BG.fetchJson,
      error: `Network error: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
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

async function fetchQualityProfiles(
  baseUrl: string,
  apiKey: string,
): Promise<{ items: DiscoveryCatalogs['qualityProfiles']; error?: string }> {
  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${baseUrl}/api/v3/qualityprofile`,
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

async function fetchRootFolders(
  baseUrl: string,
  apiKey: string,
): Promise<{ items: DiscoveryCatalogs['rootFolders']; error?: string }> {
  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${baseUrl}/api/v3/rootfolder`,
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

async function fetchTags(
  baseUrl: string,
  apiKey: string,
): Promise<{ items: DiscoveryCatalogs['tags']; error?: string }> {
  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${baseUrl}/api/v3/tag`,
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

function reconcileSelections(
  catalogs: DiscoveryCatalogs,
  selections: DiscoverySelections,
): { next: DiscoverySelections; invalid: FetchDiscoveryCatalogsResponse['invalidSelections'] } {
  const invalid: FetchDiscoveryCatalogsResponse['invalidSelections'] = {};
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

function normalizeTags(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => Number(tag))
    .filter((tag) => Number.isFinite(tag));
}

function buildUpdatePayload(
  existing: Record<string, unknown>,
  overrides: Partial<UpdateScenePayload>,
): { payload?: UpdateScenePayload; error?: string } {
  const qualityProfileId = Number(existing.qualityProfileId);
  const rootFolderPath =
    typeof existing.rootFolderPath === 'string' ? existing.rootFolderPath : '';
  const path = typeof existing.path === 'string' ? existing.path : undefined;
  if (!Number.isFinite(qualityProfileId) || !rootFolderPath) {
    return { error: 'Whisparr scene missing required fields.' };
  }

  return {
    payload: {
      id: Number(existing.id),
      monitored: Boolean(existing.monitored),
      qualityProfileId,
      rootFolderPath,
      tags: normalizeTags(existing.tags),
      title: typeof existing.title === 'string' ? existing.title : undefined,
      year: Number.isFinite(Number(existing.year)) ? Number(existing.year) : undefined,
      path,
      ...overrides,
    },
  };
}

async function handleValidateConnection(
  baseUrl: string,
  apiKey: string,
): Promise<ValidateConnectionResponse> {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.validateConnection,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  if (!apiKey.trim()) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.validateConnection,
      error: 'API key is required.',
    };
  }

  const targetUrl = `${normalized.value}/api/v3/system/status`;
  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: targetUrl,
    headers: {
      'X-Api-Key': apiKey.trim(),
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.validateConnection,
      status: response.status,
      error: response.error ?? 'Validation failed.',
      data: response.json ?? response.text,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES_BG.validateConnection,
    status: response.status,
    data: response.json ?? response.text,
  };
}

async function handleFetchDiscoveryCatalogs(
  request: ExtensionRequest,
): Promise<FetchDiscoveryCatalogsResponse> {
  if (request.type !== MESSAGE_TYPES_BG.fetchDiscoveryCatalogs) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.fetchDiscoveryCatalogs,
      errors: { settings: 'Invalid request type.' },
    };
  }

  if (request.kind !== 'whisparr') {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.fetchDiscoveryCatalogs,
      errors: { settings: 'Unsupported discovery kind.' },
    };
  }

  const errors: DiscoveryErrors = {};
  const settings = await getSettings();
  const baseUrlRaw = request.baseUrl ?? settings.whisparrBaseUrl;
  const apiKeyRaw = request.apiKey ?? settings.whisparrApiKey;
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
    type: MESSAGE_TYPES_BG.fetchDiscoveryCatalogs,
    catalogs: catalogsForUi,
    selections: toUiSelections(reconciled.next),
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    invalidSelections:
      reconciled.invalid && Object.keys(reconciled.invalid).length > 0
        ? reconciled.invalid
        : undefined,
  };
}

async function fetchSceneLookup(
  baseUrl: string,
  apiKey: string,
  stashId: string,
): Promise<{ scene?: Record<string, unknown>; error?: string }> {
  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
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

async function handleAddScene(
  request: ExtensionRequest,
): Promise<AddSceneResponse> {
  if (request.type !== MESSAGE_TYPES_BG.addScene) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: 'Invalid request type.',
    };
  }

  const stashId = request.stashdbSceneId?.trim();
  if (!stashId) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: 'Scene ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: `Permission missing for ${origin}`,
    };
  }

  const selections = await getSelections();
  const qualityProfileId = selections.whisparr.qualityProfileId;
  const rootFolderPath = selections.whisparr.rootFolderPath;
  if (!qualityProfileId || !rootFolderPath) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: 'Missing quality profile or root folder selection.',
    };
  }

  const lookup = await fetchSceneLookup(normalized.value, apiKey, stashId);
  if (!lookup.scene) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: lookup.error ?? 'Lookup failed.',
    };
  }

  const foreignId = typeof lookup.scene.foreignId === 'string'
    ? lookup.scene.foreignId
    : `stash:${stashId}`;
  const title = typeof lookup.scene.title === 'string' ? lookup.scene.title : undefined;

  const payload: AddScenePayload = {
    foreignId,
    title,
    qualityProfileId,
    rootFolderPath,
    tags: selections.whisparr.tagIds ?? [],
    searchForMovie: true,
  };

  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie`,
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.addScene,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.addScene,
        error: 'Validation failed (check selections).',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  if (!isRecord(response.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.addScene,
      error: 'Unexpected response payload.',
    };
  }

  const whisparrId = Number(response.json.id);
  return {
    ok: true,
    type: MESSAGE_TYPES_BG.addScene,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
  };
}

async function handleSetMonitorState(
  request: ExtensionRequest,
): Promise<SetMonitorStateResponse> {
  if (request.type !== MESSAGE_TYPES_BG.setMonitorState) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: false,
      error: 'Invalid request type.',
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: false,
      error: 'Whisparr ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: false,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: false,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: false,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: false,
      error: `Permission missing for ${origin}`,
    };
  }

  const existingResponse = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: Boolean(request.monitored),
      error: existingResponse.error ?? 'Failed to fetch Whisparr scene.',
    };
  }

  const existing = existingResponse.json;
  const build = buildUpdatePayload(existing, {
    id: whisparrId,
    monitored: Boolean(request.monitored),
  });
  if (!build.payload) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: Boolean(request.monitored),
      error: build.error ?? 'Whisparr scene missing required fields.',
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    method: 'PUT',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(build.payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.setMonitorState,
        monitored: Boolean(request.monitored),
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.setMonitorState,
        monitored: Boolean(request.monitored),
        error: 'Validation failed.',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.setMonitorState,
      monitored: Boolean(request.monitored),
      error: response.error ?? `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES_BG.setMonitorState,
    monitored: Boolean(request.monitored),
  };
}

async function handleUpdateTags(
  request: ExtensionRequest,
): Promise<UpdateTagsResponse> {
  if (request.type !== MESSAGE_TYPES_BG.updateTags) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: 'Invalid request type.',
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: 'Whisparr ID is required.',
    };
  }

  const tagIds = normalizeTags(request.tagIds);

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: `Permission missing for ${origin}`,
    };
  }

  const existingResponse = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: existingResponse.error ?? 'Failed to fetch Whisparr scene.',
    };
  }

  const build = buildUpdatePayload(existingResponse.json, {
    id: whisparrId,
    tags: tagIds,
  });
  if (!build.payload) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: build.error ?? 'Whisparr scene missing required fields.',
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    method: 'PUT',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(build.payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.updateTags,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.updateTags,
        error: 'Validation failed (check tags).',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateTags,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES_BG.updateTags,
    tagIds,
  };
}

async function handleUpdateQualityProfile(
  request: ExtensionRequest,
): Promise<UpdateQualityProfileResponse> {
  if (request.type !== MESSAGE_TYPES_BG.updateQualityProfile) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: 'Invalid request type.',
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: 'Whisparr ID is required.',
    };
  }

  const qualityProfileId = Number(request.qualityProfileId);
  if (!Number.isFinite(qualityProfileId) || qualityProfileId <= 0) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: 'Quality profile is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: `Permission missing for ${origin}`,
    };
  }

  const existingResponse = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: existingResponse.error ?? 'Failed to fetch Whisparr scene.',
    };
  }

  const build = buildUpdatePayload(existingResponse.json, {
    id: whisparrId,
    qualityProfileId,
  });
  if (!build.payload) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: build.error ?? 'Whisparr scene missing required fields.',
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    method: 'PUT',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(build.payload),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.updateQualityProfile,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES_BG.updateQualityProfile,
        error: 'Validation failed (check profile).',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.updateQualityProfile,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES_BG.updateQualityProfile,
    qualityProfileId,
  };
}

async function handleCheckSceneStatus(
  request: ExtensionRequest,
): Promise<CheckSceneStatusResponse> {
  if (request.type !== MESSAGE_TYPES_BG.checkSceneStatus) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: 'Invalid request type.',
    };
  }

  const stashId = request.stashdbSceneId?.trim();
  if (!stashId) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: 'Scene ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: `Permission missing for ${origin}`,
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES_BG.fetchJson,
    url: `${normalized.value}/api/v3/movie?stashId=${encodeURIComponent(stashId)}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: response.error ?? 'Lookup failed.',
    };
  }

  if (!Array.isArray(response.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
      error: 'Unexpected response payload.',
    };
  }

  const first = response.json.find(isRecord);
  if (!first) {
    return {
      ok: true,
      type: MESSAGE_TYPES_BG.checkSceneStatus,
      exists: false,
    };
  }

  const whisparrId = Number(first.id);
  const title = typeof first.title === 'string' ? first.title : undefined;
  const hasFile =
    typeof first.hasFile === 'boolean' ? first.hasFile : undefined;
  const monitored =
    typeof first.monitored === 'boolean' ? first.monitored : undefined;
  const tagIds = normalizeTags(first.tags);
  const qualityProfileId = Number(first.qualityProfileId);

  return {
    ok: true,
    type: MESSAGE_TYPES_BG.checkSceneStatus,
    exists: true,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
    title,
    hasFile,
    monitored,
    tagIds,
    qualityProfileId: Number.isFinite(qualityProfileId)
      ? qualityProfileId
      : undefined,
  };
}

async function handleSaveSelections(
  request: ExtensionRequest,
): Promise<SaveSelectionsResponse> {
  if (request.type !== MESSAGE_TYPES_BG.saveSelections) {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.saveSelections,
      error: 'Invalid request type.',
    };
  }

  if (request.selections?.kind !== 'whisparr') {
    return {
      ok: false,
      type: MESSAGE_TYPES_BG.saveSelections,
      error: 'Unsupported selection kind.',
    };
  }

  const catalogsState = await getCatalogs();
  const catalogs = catalogsState.whisparr;
  const qualityProfileId = request.selections.qualityProfileId;
  const rootFolderPath = request.selections.rootFolderPath;
  const labelIds = request.selections.labelIds ?? [];

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
  return {
    ok: true,
    type: MESSAGE_TYPES_BG.saveSelections,
    selections: toUiSelections(saved.whisparr),
  };
}

ext.runtime.onMessage.addListener(
  (
    request: ExtensionRequest,
    _sender: unknown,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
  const respond = async (): Promise<ExtensionResponse> => {
      if (request?.type === MESSAGE_TYPES_BG.ping) {
        return {
          ok: true,
          type: MESSAGE_TYPES_BG.ping,
          version: VERSION,
          timestamp: new Date().toISOString(),
        };
      }

      if (request?.type === MESSAGE_TYPES_BG.fetchJson) {
        return handleFetchJson(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.validateConnection) {
        return handleValidateConnection(request.baseUrl, request.apiKey);
      }

      if (request?.type === MESSAGE_TYPES_BG.getSettings) {
        const settings = await getSettings();
        return { ok: true, type: MESSAGE_TYPES_BG.getSettings, settings };
      }

      if (request?.type === MESSAGE_TYPES_BG.getConfigStatus) {
        const settings = await getSettings();
        const configured = Boolean(
          settings.whisparrBaseUrl && settings.whisparrApiKey,
        );
        return {
          ok: true,
          type: MESSAGE_TYPES_BG.getConfigStatus,
          configured,
        };
      }

      if (request?.type === MESSAGE_TYPES_BG.saveSettings) {
        const settings = await saveSettings(request.settings);
        return { ok: true, type: MESSAGE_TYPES_BG.saveSettings, settings };
      }

      if (request?.type === MESSAGE_TYPES_BG.resetSettings) {
        await resetSettings();
        return { ok: true, type: MESSAGE_TYPES_BG.resetSettings };
      }

      if (request?.type === MESSAGE_TYPES_BG.fetchDiscoveryCatalogs) {
        return handleFetchDiscoveryCatalogs(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.saveSelections) {
        return handleSaveSelections(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.checkSceneStatus) {
        return handleCheckSceneStatus(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.addScene) {
        return handleAddScene(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.setMonitorState) {
        return handleSetMonitorState(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.updateTags) {
        return handleUpdateTags(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.updateQualityProfile) {
        return handleUpdateQualityProfile(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.requestPermission) {
        if (!ext.permissions?.request) {
          return {
            ok: false,
            type: MESSAGE_TYPES_BG.requestPermission,
            granted: false,
            error: 'Permissions API not available.',
          };
        }
        try {
          const granted = await ext.permissions.request({
            origins: [request.origin],
          });
          return {
            ok: true,
            type: MESSAGE_TYPES_BG.requestPermission,
            granted,
          };
        } catch (error) {
          return {
            ok: false,
            type: MESSAGE_TYPES_BG.requestPermission,
            granted: false,
            error: (error as Error).message,
          };
        }
      }

      if (request?.type === MESSAGE_TYPES_BG.getPermission) {
        if (!ext.permissions?.contains) {
          return {
            ok: false,
            type: MESSAGE_TYPES_BG.getPermission,
            granted: false,
            error: 'Permissions API not available.',
          };
        }
        try {
          const granted = await ext.permissions.contains({
            origins: [request.origin],
          });
          return {
            ok: true,
            type: MESSAGE_TYPES_BG.getPermission,
            granted,
          };
        } catch (error) {
          return {
            ok: false,
            type: MESSAGE_TYPES_BG.getPermission,
            granted: false,
            error: (error as Error).message,
          };
        }
      }

      if (request?.type === MESSAGE_TYPES_BG.openOptionsPage) {
        if (ext.runtime.openOptionsPage) {
          ext.runtime.openOptionsPage();
          return { ok: true, type: MESSAGE_TYPES_BG.openOptionsPage };
        }
        return {
          ok: false,
          type: MESSAGE_TYPES_BG.openOptionsPage,
          error: 'openOptionsPage not available.',
        };
      }

      return {
        ok: false,
        type: MESSAGE_TYPES_BG.fetchJson,
        error: 'Unknown message type',
      };
    };

    respond()
      .then((response) => sendResponse(response))
      .catch((error) =>
        sendResponse({
          ok: false,
          type: MESSAGE_TYPES_BG.fetchJson,
          error: `Unhandled error: ${(error as Error).message}`,
        }),
      );

    return true;
  },
);
