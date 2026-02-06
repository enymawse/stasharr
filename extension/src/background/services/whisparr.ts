import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type FetchDiscoveryCatalogsResponse,
  type DiscoveryCatalogs,
  type DiscoverySelections,
  type DiscoverySelectionsForUi,
  type ValidateConnectionResponse,
  type CheckSceneStatusResponse,
  type AddSceneResponse,
  type SetMonitorStateResponse,
  type UpdateTagsResponse,
  type UpdateQualityProfileResponse,
  type SceneCardActionRequestedResponse,
  type SceneCardsCheckStatusResponse,
  type SceneCardAddResponse,
  type SceneCardTriggerSearchResponse,
  type SceneCardSetExcludedResponse,
  type SaveSelectionsResponse,
} from '../../shared/messages.js';
import {
  getCatalogs,
  getSelections,
  getSettings,
  saveCatalogs,
  saveSelections,
} from '../../shared/storage.js';
import { fetchWithTimeout, handleFetchJson } from '../http.js';

type ExtRuntimeBg = {
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

const REQUEST_TIMEOUT_MS = 10_000;
const SCENE_CARD_STATUS_BATCH_LIMIT = 25;

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
  foreignId: string;
  title?: string;
  addOptions: {
    searchForMovie: boolean;
  };
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

function normalizeBaseUrl(raw: string): {
  ok: boolean;
  value?: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Base URL is required.' };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      ok: false,
      error: 'Base URL must include a scheme (http or https).',
    };
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

function toUiSelections(
  selections: DiscoverySelections,
): DiscoverySelectionsForUi {
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
  const response = await fetchWithTimeout({
    url: `${baseUrl}/api/v3/qualityprofile`,
    headers: { 'X-Api-Key': apiKey },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  if (!response.ok) {
    return {
      items: [],
      error: response.error ?? 'Quality profiles request failed.',
    };
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
  const response = await fetchWithTimeout({
    url: `${baseUrl}/api/v3/rootfolder`,
    headers: { 'X-Api-Key': apiKey },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  if (!response.ok) {
    return {
      items: [],
      error: response.error ?? 'Root folders request failed.',
    };
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
  const response = await fetchWithTimeout({
    url: `${baseUrl}/api/v3/tag`,
    headers: { 'X-Api-Key': apiKey },
    timeoutMs: REQUEST_TIMEOUT_MS,
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
): {
  next: DiscoverySelections;
  invalid: FetchDiscoveryCatalogsResponse['invalidSelections'];
} {
  const invalid: FetchDiscoveryCatalogsResponse['invalidSelections'] = {};
  const next: DiscoverySelections = {
    qualityProfileId: selections.qualityProfileId,
    rootFolderPath: selections.rootFolderPath,
    tagIds: [...selections.tagIds],
  };

  if (
    next.qualityProfileId !== null &&
    !catalogs.qualityProfiles.some(
      (profile) => profile.id === next.qualityProfileId,
    )
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
  return value.map((tag) => Number(tag)).filter((tag) => Number.isFinite(tag));
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
      year: Number.isFinite(Number(existing.year))
        ? Number(existing.year)
        : undefined,
      path,
      ...overrides,
    },
  };
}

async function fetchExclusionState(
  baseUrl: string,
  apiKey: string,
  sceneId: string,
) {
  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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
  return {
    excluded: true,
    exclusionId: Number.isFinite(exclusionId) ? exclusionId : undefined,
  };
}

async function fetchSceneLookup(
  baseUrl: string,
  apiKey: string,
  stashId: string,
): Promise<{ scene?: Record<string, unknown>; error?: string }> {
  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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

export async function handleValidateWhisparrConnection(
  request: ExtensionRequest,
): Promise<ValidateConnectionResponse> {
  if (request.type !== MESSAGE_TYPES.validateConnection) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: 'Invalid request type.',
    };
  }

  const baseUrl = request.baseUrl ?? '';
  const apiKey = request.apiKey ?? '';
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

  const targetUrl = `${normalized.value}/api/v3/system/status`;
  const response = await fetchWithTimeout({
    url: targetUrl,
    headers: {
      'X-Api-Key': apiKey.trim(),
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
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

export async function handleFetchDiscoveryCatalogs(
  request: ExtensionRequest,
): Promise<FetchDiscoveryCatalogsResponse> {
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
      catalogsForUi.rootFolders = rootResult.error
        ? cached.rootFolders
        : rootResult.items;
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

  const reconciled = reconcileSelections(
    catalogsForUi,
    selectionsState.whisparr,
  );
  if (
    reconciled.next.qualityProfileId !==
      selectionsState.whisparr.qualityProfileId ||
    reconciled.next.rootFolderPath !==
      selectionsState.whisparr.rootFolderPath ||
    reconciled.next.tagIds.join(',') !==
      selectionsState.whisparr.tagIds.join(',')
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

export async function handleAddScene(
  request: ExtensionRequest,
): Promise<AddSceneResponse> {
  if (request.type !== MESSAGE_TYPES.addScene) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: 'Invalid request type.',
    };
  }

  const stashId = request.stashdbSceneId?.trim();
  if (!stashId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: 'Scene ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: `Permission missing for ${origin}`,
    };
  }

  const selections = await getSelections();
  const qualityProfileId = selections.whisparr.qualityProfileId;
  const rootFolderPath = selections.whisparr.rootFolderPath;
  if (!qualityProfileId || !rootFolderPath) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: 'Missing quality profile or root folder selection.',
    };
  }

  const lookup = await fetchSceneLookup(normalized.value, apiKey, stashId);
  if (!lookup.scene) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: lookup.error ?? 'Lookup failed.',
    };
  }

  const foreignId =
    typeof lookup.scene.foreignId === 'string'
      ? lookup.scene.foreignId
      : `stash:${stashId}`;
  const title =
    typeof lookup.scene.title === 'string' ? lookup.scene.title : undefined;

  const payload: AddScenePayload = {
    foreignId,
    title,
    qualityProfileId,
    rootFolderPath,
    tags: selections.whisparr.tagIds ?? [],
    addOptions: {
      searchForMovie: true,
    },
  };

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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
        type: MESSAGE_TYPES.addScene,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.addScene,
        error: 'Validation failed (check selections).',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  if (!isRecord(response.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.addScene,
      error: 'Unexpected response payload.',
    };
  }

  const whisparrId = Number(response.json.id);
  return {
    ok: true,
    type: MESSAGE_TYPES.addScene,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
  };
}

export async function handleSetMonitorState(
  request: ExtensionRequest,
): Promise<SetMonitorStateResponse> {
  if (request.type !== MESSAGE_TYPES.setMonitorState) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: false,
      error: 'Invalid request type.',
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: false,
      error: 'Whisparr ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: false,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: false,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: false,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: false,
      error: `Permission missing for ${origin}`,
    };
  }

  const existingResponse = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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

  const existing = existingResponse.json;
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
    type: MESSAGE_TYPES.fetchJson,
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
        type: MESSAGE_TYPES.setMonitorState,
        monitored: Boolean(request.monitored),
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.setMonitorState,
        monitored: Boolean(request.monitored),
        error: 'Validation failed.',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.setMonitorState,
      monitored: Boolean(request.monitored),
      error: response.error ?? `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.setMonitorState,
    monitored: Boolean(request.monitored),
  };
}

export async function handleUpdateTags(
  request: ExtensionRequest,
): Promise<UpdateTagsResponse> {
  if (request.type !== MESSAGE_TYPES.updateTags) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: 'Invalid request type.',
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: 'Whisparr ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: `Permission missing for ${origin}`,
    };
  }

  const existingResponse = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: existingResponse.error ?? 'Failed to fetch Whisparr scene.',
    };
  }

  const existing = existingResponse.json;
  const build = buildUpdatePayload(existing, {
    id: whisparrId,
    tags: request.tagIds ?? [],
  });
  if (!build.payload) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: build.error ?? 'Whisparr scene missing required fields.',
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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
        type: MESSAGE_TYPES.updateTags,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.updateTags,
        error: 'Validation failed.',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.updateTags,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.updateTags,
    tagIds: request.tagIds,
  };
}

export async function handleUpdateQualityProfile(
  request: ExtensionRequest,
): Promise<UpdateQualityProfileResponse> {
  if (request.type !== MESSAGE_TYPES.updateQualityProfile) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: 'Invalid request type.',
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: 'Whisparr ID is required.',
    };
  }

  const qualityProfileId = Number(request.qualityProfileId);
  if (!Number.isFinite(qualityProfileId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: 'Quality profile ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: `Permission missing for ${origin}`,
    };
  }

  const existingResponse = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
    url: `${normalized.value}/api/v3/movie/${whisparrId}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!existingResponse.ok || !isRecord(existingResponse.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: existingResponse.error ?? 'Failed to fetch Whisparr scene.',
    };
  }

  const existing = existingResponse.json;
  const build = buildUpdatePayload(existing, {
    id: whisparrId,
    qualityProfileId,
  });
  if (!build.payload) {
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: build.error ?? 'Whisparr scene missing required fields.',
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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
        type: MESSAGE_TYPES.updateQualityProfile,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.updateQualityProfile,
        error: 'Validation failed.',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.updateQualityProfile,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.updateQualityProfile,
    qualityProfileId,
  };
}

export async function handleSceneCardAction(
  request: ExtensionRequest,
): Promise<SceneCardActionRequestedResponse> {
  if (request.type !== MESSAGE_TYPES.sceneCardActionRequested) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardActionRequested,
      error: 'Invalid request type.',
    };
  }

  return { ok: true, type: MESSAGE_TYPES.sceneCardActionRequested };
}

export async function handleSceneCardsCheckStatus(
  request: ExtensionRequest,
): Promise<SceneCardsCheckStatusResponse> {
  if (request.type !== MESSAGE_TYPES.sceneCardsCheckStatus) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardsCheckStatus,
      error: 'Invalid request type.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardsCheckStatus,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardsCheckStatus,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardsCheckStatus,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardsCheckStatus,
      error: `Permission missing for ${origin}`,
    };
  }

  const items = request.items ?? [];
  const results: SceneCardsCheckStatusResponse['results'] = [];
  for (const item of items.slice(0, SCENE_CARD_STATUS_BATCH_LIMIT)) {
    const sceneId = item.sceneId;
    if (!sceneId) continue;

    const response = await handleFetchJson({
      type: MESSAGE_TYPES.fetchJson,
      url: `${normalized.value}/api/v3/movie?stashId=${encodeURIComponent(sceneId)}`,
      headers: { 'X-Api-Key': apiKey },
    });

    if (!response.ok) {
      results.push({ sceneId, exists: false });
      continue;
    }

    if (!Array.isArray(response.json) || response.json.length === 0) {
      const excluded = await fetchExclusionState(
        normalized.value,
        apiKey,
        sceneId,
      );
      results.push({ sceneId, exists: false, excluded: excluded.excluded });
      continue;
    }

    const movie = response.json.find(isRecord);
    if (!movie) {
      const excluded = await fetchExclusionState(
        normalized.value,
        apiKey,
        sceneId,
      );
      results.push({ sceneId, exists: false, excluded: excluded.excluded });
      continue;
    }

    const whisparrId = Number(movie.id);
    const monitored = Boolean(movie.monitored);
    const tagIds = normalizeTags(movie.tags);
    const hasFile = Boolean(movie.hasFile);
    results.push({
      sceneId,
      exists: true,
      whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
      monitored,
      tagIds,
      hasFile,
      excluded: undefined,
    });
  }

  return { ok: true, type: MESSAGE_TYPES.sceneCardsCheckStatus, results };
}

export async function handleSceneCardTriggerSearch(
  request: ExtensionRequest,
): Promise<SceneCardTriggerSearchResponse> {
  if (request.type !== MESSAGE_TYPES.sceneCardTriggerSearch) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: { code: 'invalid_request', message: 'Invalid request type.' },
    };
  }

  const whisparrId = Number(request.whisparrId);
  if (!Number.isFinite(whisparrId)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: { code: 'missing_id', message: 'Whisparr ID is required.' },
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: {
        code: 'invalid_base_url',
        message: normalized.error ?? 'Invalid base URL.',
      },
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: { code: 'missing_key', message: 'API key is required.' },
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: {
        code: 'no_permissions',
        message: 'Permissions API not available.',
      },
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: {
        code: 'permission_missing',
        message: `Permission missing for ${origin}`,
      },
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
    url: `${normalized.value}/api/v3/command`,
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'MoviesSearch',
      movieIds: [whisparrId],
    }),
  });

  if (!response.ok) {
    const status = response.status ?? 0;
    if (status === 401 || status === 403) {
      return {
        ok: false,
        type: MESSAGE_TYPES.sceneCardTriggerSearch,
        error: {
          code: 'unauthorized',
          message: 'Unauthorized (check API key).',
        },
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.sceneCardTriggerSearch,
        error: {
          code: 'validation',
          message: 'Validation failed (check Whisparr item).',
        },
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardTriggerSearch,
      error: {
        code: `http_${status}`,
        message: response.error ?? `HTTP ${status}`,
      },
    };
  }

  return { ok: true, type: MESSAGE_TYPES.sceneCardTriggerSearch };
}

export async function handleSceneCardSetExcluded(
  request: ExtensionRequest,
): Promise<SceneCardSetExcludedResponse> {
  if (request.type !== MESSAGE_TYPES.sceneCardSetExcluded) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: { code: 'invalid_request', message: 'Invalid request type.' },
    };
  }

  const sceneId = request.sceneId?.trim();
  if (!sceneId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: { code: 'missing_id', message: 'Scene ID is required.' },
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: {
        code: 'invalid_base_url',
        message: normalized.error ?? 'Invalid base URL.',
      },
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: { code: 'missing_key', message: 'API key is required.' },
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: {
        code: 'no_permissions',
        message: 'Permissions API not available.',
      },
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: {
        code: 'permission_missing',
        message: `Permission missing for ${origin}`,
      },
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
    url: `${normalized.value}/api/v3/exclusions?stashId=${encodeURIComponent(sceneId)}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: {
        code: `http_${response.status ?? 0}`,
        message: response.error ?? `HTTP ${response.status ?? 0}`,
      },
    };
  }

  const existing = Array.isArray(response.json)
    ? response.json.find(isRecord)
    : undefined;
  const exclusionId = existing ? Number(existing.id) : undefined;

  if (request.excluded) {
    if (exclusionId) {
      return {
        ok: true,
        type: MESSAGE_TYPES.sceneCardSetExcluded,
        excluded: true,
      };
    }

    const payload = {
      foreignId: sceneId,
      movieTitle: request.movieTitle ?? sceneId,
      movieYear: request.movieYear ?? 1,
    };
    const addResponse = await handleFetchJson({
      type: MESSAGE_TYPES.fetchJson,
      url: `${normalized.value}/api/v3/exclusions`,
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!addResponse.ok) {
      const status = addResponse.status ?? 0;
      if (status === 401 || status === 403) {
        return {
          ok: false,
          type: MESSAGE_TYPES.sceneCardSetExcluded,
          error: {
            code: 'unauthorized',
            message: 'Unauthorized (check API key).',
          },
        };
      }
      if (status === 400) {
        return {
          ok: false,
          type: MESSAGE_TYPES.sceneCardSetExcluded,
          error: {
            code: 'validation',
            message: 'Validation failed (check exclusion).',
          },
        };
      }
      return {
        ok: false,
        type: MESSAGE_TYPES.sceneCardSetExcluded,
        error: {
          code: `http_${status}`,
          message: addResponse.error ?? `HTTP ${status}`,
        },
      };
    }

    return {
      ok: true,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      excluded: true,
    };
  }

  if (!exclusionId) {
    return {
      ok: true,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      excluded: false,
    };
  }

  const deleteResponse = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
    url: `${normalized.value}/api/v3/exclusions/${exclusionId}`,
    method: 'DELETE',
    headers: { 'X-Api-Key': apiKey },
  });
  if (!deleteResponse.ok) {
    const status = deleteResponse.status ?? 0;
    if (status === 401 || status === 403) {
      return {
        ok: false,
        type: MESSAGE_TYPES.sceneCardSetExcluded,
        error: {
          code: 'unauthorized',
          message: 'Unauthorized (check API key).',
        },
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.sceneCardSetExcluded,
        error: {
          code: 'validation',
          message: 'Validation failed (check exclusion).',
        },
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardSetExcluded,
      error: {
        code: `http_${status}`,
        message: deleteResponse.error ?? `HTTP ${status}`,
      },
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.sceneCardSetExcluded,
    excluded: false,
  };
}

export async function handleSceneCardAdd(
  request: ExtensionRequest,
): Promise<SceneCardAddResponse> {
  if (request.type !== MESSAGE_TYPES.sceneCardAdd) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: 'Invalid request type.',
    };
  }

  const sceneId = request.sceneId?.trim();
  if (!sceneId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: 'Scene ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: `Permission missing for ${origin}`,
    };
  }

  const selections = await getSelections();
  const qualityProfileId = selections.whisparr.qualityProfileId;
  const rootFolderPath = selections.whisparr.rootFolderPath;
  if (!qualityProfileId || !rootFolderPath) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: 'Missing quality profile or root folder selection.',
    };
  }

  const lookup = await fetchSceneLookup(normalized.value, apiKey, sceneId);
  if (!lookup.scene) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: lookup.error ?? 'Lookup failed.',
    };
  }

  const foreignId =
    typeof lookup.scene.foreignId === 'string'
      ? lookup.scene.foreignId
      : `stash:${sceneId}`;
  const title =
    typeof lookup.scene.title === 'string' ? lookup.scene.title : undefined;

  const payload: AddScenePayload = {
    foreignId,
    title,
    qualityProfileId,
    rootFolderPath,
    tags: selections.whisparr.tagIds ?? [],
    addOptions: {
      searchForMovie: true,
    },
  };

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
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
        type: MESSAGE_TYPES.sceneCardAdd,
        error: 'Unauthorized (check API key).',
      };
    }
    if (status === 400) {
      return {
        ok: false,
        type: MESSAGE_TYPES.sceneCardAdd,
        error: 'Validation failed (check selections).',
      };
    }
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: response.error ?? `HTTP ${status}`,
    };
  }

  if (!isRecord(response.json)) {
    return {
      ok: false,
      type: MESSAGE_TYPES.sceneCardAdd,
      error: 'Unexpected response payload.',
    };
  }

  const whisparrId = Number(response.json.id);
  return {
    ok: true,
    type: MESSAGE_TYPES.sceneCardAdd,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
  };
}

export async function handleCheckSceneStatus(
  request: ExtensionRequest,
): Promise<CheckSceneStatusResponse> {
  if (request.type !== MESSAGE_TYPES.checkSceneStatus) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: 'Invalid request type.',
    };
  }

  const stashId = request.stashdbSceneId?.trim();
  if (!stashId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: 'Scene ID is required.',
    };
  }

  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.whisparrBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: normalized.error ?? 'Invalid base URL.',
    };
  }

  const apiKey = settings.whisparrApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: 'API key is required.',
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: 'Permissions API not available.',
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: `Permission missing for ${origin}`,
    };
  }

  const response = await handleFetchJson({
    type: MESSAGE_TYPES.fetchJson,
    url: `${normalized.value}/api/v3/movie?stashId=${encodeURIComponent(stashId)}`,
    headers: { 'X-Api-Key': apiKey },
  });

  if (!response.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      error: response.error ?? 'Request failed.',
    };
  }

  if (!Array.isArray(response.json) || response.json.length === 0) {
    const excluded = await fetchExclusionState(
      normalized.value,
      apiKey,
      stashId,
    );
    return {
      ok: true,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      excluded: excluded.excluded,
    };
  }

  const movie = response.json.find(isRecord);
  if (!movie) {
    const excluded = await fetchExclusionState(
      normalized.value,
      apiKey,
      stashId,
    );
    return {
      ok: true,
      type: MESSAGE_TYPES.checkSceneStatus,
      exists: false,
      excluded: excluded.excluded,
    };
  }

  const whisparrId = Number(movie.id);
  return {
    ok: true,
    type: MESSAGE_TYPES.checkSceneStatus,
    exists: true,
    whisparrId: Number.isFinite(whisparrId) ? whisparrId : undefined,
    title: typeof movie.title === 'string' ? movie.title : undefined,
    hasFile: Boolean(movie.hasFile),
    monitored: Boolean(movie.monitored),
    tagIds: normalizeTags(movie.tags),
    qualityProfileId: Number(movie.qualityProfileId),
  };
}

export async function handleSaveSelections(
  request: ExtensionRequest,
): Promise<SaveSelectionsResponse> {
  if (request.type !== MESSAGE_TYPES.saveSelections) {
    return {
      ok: false,
      type: MESSAGE_TYPES.saveSelections,
      error: 'Invalid request type.',
    };
  }

  if (request.selections.kind !== 'whisparr') {
    return {
      ok: false,
      type: MESSAGE_TYPES.saveSelections,
      error: 'Unsupported selections kind.',
    };
  }

  const nextSelections: DiscoverySelections = {
    qualityProfileId: request.selections.qualityProfileId,
    rootFolderPath: request.selections.rootFolderPath,
    tagIds: request.selections.labelIds ?? [],
  };
  const selections = await saveSelections({ whisparr: nextSelections });
  return {
    ok: true,
    type: MESSAGE_TYPES.saveSelections,
    selections: toUiSelections(selections.whisparr),
  };
}
