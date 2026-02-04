const MESSAGE_TYPES_CONTENT = {
  getConfigStatus: 'GET_CONFIG_STATUS',
} as const;

type GetConfigStatusRequest = { type: typeof MESSAGE_TYPES_CONTENT.getConfigStatus };
type GetSettingsRequest = { type: 'GET_SETTINGS' };
type OpenOptionsPageRequest = { type: 'OPEN_OPTIONS_PAGE' };
type CheckSceneStatusRequest = { type: 'CHECK_SCENE_STATUS'; stashdbSceneId: string };
type AddSceneRequest = { type: 'ADD_SCENE'; stashdbSceneId: string };
type SetMonitorStateRequest = { type: 'SET_MONITOR_STATE'; whisparrId: number; monitored: boolean };
type FetchDiscoveryCatalogsRequest = { type: 'FETCH_DISCOVERY_CATALOGS'; kind: 'whisparr'; force?: boolean };
type UpdateTagsRequest = { type: 'UPDATE_TAGS'; whisparrId: number; tagIds: number[] };
type UpdateQualityProfileRequest = {
  type: 'UPDATE_QUALITY_PROFILE';
  whisparrId: number;
  qualityProfileId: number;
};
type SceneCardsCheckStatusRequest = {
  type: 'SCENE_CARDS_CHECK_STATUS';
  items: Array<{ sceneId: string; sceneUrl: string }>;
};
type SceneCardAddRequest = {
  type: 'SCENE_CARD_ADD';
  sceneId: string;
  sceneUrl: string;
};
type SceneCardTriggerSearchRequest = {
  type: 'SCENE_CARD_TRIGGER_SEARCH';
  whisparrId: number;
};
type SceneCardSetExcludedRequest = {
  type: 'SCENE_CARD_SET_EXCLUDED';
  sceneId: string;
  excluded: boolean;
  movieTitle?: string;
  movieYear?: number;
};

type ContentRuntime = {
  runtime: {
    sendMessage: (
      message:
        | GetConfigStatusRequest
        | GetSettingsRequest
        | OpenOptionsPageRequest
        | CheckSceneStatusRequest
        | AddSceneRequest
        | SetMonitorStateRequest
        | FetchDiscoveryCatalogsRequest
        | UpdateTagsRequest
        | UpdateQualityProfileRequest
        | SceneCardsCheckStatusRequest
        | SceneCardAddRequest
        | SceneCardTriggerSearchRequest
        | SceneCardSetExcludedRequest,
    ) => Promise<{
      ok: boolean;
      configured?: boolean;
      settings?: {
        whisparrBaseUrl?: string;
        whisparrApiKey?: string;
        lastValidatedAt?: string;
      };
      catalogs?: {
        qualityProfiles?: Array<{ id: number; name: string }>;
        tags?: Array<{ id: number; label: string }>;
      };
      tagIds?: number[];
      qualityProfileId?: number;
      exists?: boolean;
      whisparrId?: number;
      title?: string;
      hasFile?: boolean;
      monitored?: boolean;
      error?: string;
      results?: Array<{
        sceneId: string;
        exists: boolean;
        whisparrId?: number;
        monitored?: boolean;
        tagIds?: number[];
        hasFile?: boolean;
        excluded?: boolean;
      }>;
      excluded?: boolean;
    }>;
    getURL?: (path: string) => string;
    openOptionsPage?: () => void;
  };
};

const PANEL_ID = 'stasharr-extension-panel';
const extContent =
  (globalThis as typeof globalThis & { browser?: ContentRuntime; chrome?: ContentRuntime }).browser ??
  (globalThis as typeof globalThis & { chrome?: ContentRuntime }).chrome;

if (!extContent) {
  throw new Error('Extension runtime not available.');
}

const __DEV__ = true;

if (__DEV__) {
  const forbiddenMessage =
    'Networking is forbidden in content scripts; use background messaging.';
  if (typeof globalThis.fetch === 'function') {
    globalThis.fetch = (..._args) => {
      throw new Error(forbiddenMessage);
    };
  }

  if (typeof globalThis.XMLHttpRequest === 'function') {
    const OriginalXHR = globalThis.XMLHttpRequest;
    globalThis.XMLHttpRequest = class extends OriginalXHR {
      open(): void {
        throw new Error(forbiddenMessage);
      }
    };
  }
}

function truncate(value: string, max = 300) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function applyDisabledStyles(button: HTMLButtonElement, disabled: boolean) {
  button.disabled = disabled;
  if (disabled) {
    button.style.opacity = '0.55';
    button.style.cursor = 'not-allowed';
  } else {
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }
}

function getParsedPage() {
  return (
    globalThis as {
      StasharrPageParser?: {
        parseStashDbPage: (
          doc: Document,
          loc: Location,
        ) => { type: string; stashIds: string[]; canonicalUrl: string | null; url: string };
      };
    }
  ).StasharrPageParser?.parseStashDbPage(document, window.location) ?? {
    type: 'other',
    stashIds: [],
    canonicalUrl: null,
    url: window.location.href,
  };
}

if (!document.getElementById(PANEL_ID)) {
  const statusCache = new Map<
    string,
    {
      exists: boolean;
      whisparrId?: number;
      title?: string;
      hasFile?: boolean;
      monitored?: boolean;
      tagIds?: number[];
      qualityProfileId?: number;
      excluded?: boolean;
      error?: string;
    }
  >();
  const inFlight = new Set<string>();
  const tagUpdateInFlight = new Set<string>();
  const qualityProfileUpdateInFlight = new Set<string>();
  let tagCatalog: Array<{ id: number; label: string }> = [];
  let qualityProfileCatalog: Array<{ id: number; name: string }> = [];

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.position = 'fixed';
  panel.style.right = '16px';
  panel.style.bottom = '16px';
  panel.style.zIndex = '2147483647';
  panel.style.background = 'rgba(20, 20, 24, 0.9)';
  panel.style.color = '#f5f5f5';
  panel.style.padding = '10px 12px';
  panel.style.borderRadius = '8px';
  panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';
  panel.style.fontSize = '12px';
  panel.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.25)';
  panel.style.maxWidth = '280px';

  const heading = document.createElement('div');
  heading.textContent = 'Stasharr Extension (dev)';
  heading.style.fontWeight = '600';
  heading.style.marginBottom = '6px';
  panel.appendChild(heading);

  const diagnostics = document.createElement('div');
  let parsedPage = getParsedPage();
  diagnostics.textContent = `Diagnostics: ${parsedPage.type} • ${truncate(parsedPage.url, 140)}`;
  diagnostics.style.opacity = '0.85';
  panel.appendChild(diagnostics);

  const parseDetails = document.createElement('div');
  parseDetails.style.marginTop = '6px';
  parseDetails.style.fontSize = '11px';
  parseDetails.style.opacity = '0.9';
  const updateDiagnostics = () => {
    parsedPage = getParsedPage();
    const idsText =
      parsedPage.stashIds.length > 0 ? parsedPage.stashIds.join(', ') : 'none';
    const canonicalText = parsedPage.canonicalUrl ?? 'none';
    diagnostics.textContent = `Diagnostics: ${parsedPage.type} • ${truncate(parsedPage.url, 140)}`;
    parseDetails.textContent = `Detected: ${parsedPage.type} | IDs: ${idsText} | Canonical: ${canonicalText}`;
  };
  updateDiagnostics();
  panel.appendChild(parseDetails);

  const sceneStatusRow = document.createElement('div');
  sceneStatusRow.style.marginTop = '6px';
  sceneStatusRow.style.fontSize = '11px';
  sceneStatusRow.style.opacity = '0.9';
  sceneStatusRow.textContent = 'Scene status: unknown';
  panel.appendChild(sceneStatusRow);

  const actionRow = document.createElement('div');
  actionRow.style.display = 'flex';
  actionRow.style.gap = '6px';
  actionRow.style.marginTop = '6px';
  panel.appendChild(actionRow);

  const checkStatusButton = document.createElement('button');
  checkStatusButton.type = 'button';
  checkStatusButton.textContent = 'Check status';
  checkStatusButton.style.padding = '6px 10px';
  checkStatusButton.style.borderRadius = '6px';
  checkStatusButton.style.border = 'none';
  checkStatusButton.style.cursor = 'pointer';
  checkStatusButton.style.background = '#0f766e';
  checkStatusButton.style.color = '#ffffff';
  checkStatusButton.style.flex = '1';
  actionRow.appendChild(checkStatusButton);

  const addSceneButton = document.createElement('button');
  addSceneButton.type = 'button';
  addSceneButton.textContent = 'Add to Whisparr';
  addSceneButton.style.padding = '6px 10px';
  addSceneButton.style.borderRadius = '6px';
  addSceneButton.style.border = 'none';
  addSceneButton.style.cursor = 'pointer';
  addSceneButton.style.background = '#2563eb';
  addSceneButton.style.color = '#ffffff';
  addSceneButton.style.flex = '1';
  applyDisabledStyles(addSceneButton, true);
  actionRow.appendChild(addSceneButton);

  const monitorRow = document.createElement('div');
  monitorRow.style.display = 'flex';
  monitorRow.style.gap = '6px';
  monitorRow.style.marginTop = '6px';
  panel.appendChild(monitorRow);

  const monitorToggle = document.createElement('button');
  monitorToggle.type = 'button';
  monitorToggle.textContent = 'Monitor';
  monitorToggle.style.padding = '6px 10px';
  monitorToggle.style.borderRadius = '6px';
  monitorToggle.style.border = 'none';
  monitorToggle.style.cursor = 'pointer';
  monitorToggle.style.background = '#7c3aed';
  monitorToggle.style.color = '#ffffff';
  monitorToggle.style.flex = '1';
  applyDisabledStyles(monitorToggle, true);
  monitorRow.appendChild(monitorToggle);

  const excludeToggle = document.createElement('button');
  excludeToggle.type = 'button';
  excludeToggle.textContent = 'Exclude';
  excludeToggle.style.padding = '6px 10px';
  excludeToggle.style.borderRadius = '6px';
  excludeToggle.style.border = 'none';
  excludeToggle.style.cursor = 'pointer';
  excludeToggle.style.background = '#ef4444';
  excludeToggle.style.color = '#ffffff';
  excludeToggle.style.flex = '1';
  applyDisabledStyles(excludeToggle, true);
  monitorRow.appendChild(excludeToggle);

  const qualityRow = document.createElement('div');
  qualityRow.style.marginTop = '8px';
  qualityRow.style.display = 'flex';
  qualityRow.style.flexDirection = 'column';
  qualityRow.style.gap = '6px';
  panel.appendChild(qualityRow);

  const qualityLabel = document.createElement('div');
  qualityLabel.textContent = 'Quality profile';
  qualityLabel.style.fontSize = '11px';
  qualityLabel.style.opacity = '0.8';
  qualityRow.appendChild(qualityLabel);

  const qualitySelect = document.createElement('select');
  qualitySelect.style.padding = '6px';
  qualitySelect.style.borderRadius = '6px';
  qualitySelect.style.border = '1px solid #1f2937';
  qualitySelect.style.background = '#0b1220';
  qualitySelect.style.color = '#e2e8f0';
  qualitySelect.disabled = true;
  qualityRow.appendChild(qualitySelect);

  const qualityStatus = document.createElement('div');
  qualityStatus.style.fontSize = '11px';
  qualityStatus.style.opacity = '0.8';
  qualityStatus.textContent = 'Quality: unavailable';
  qualityRow.appendChild(qualityStatus);

  const updateQualityButton = document.createElement('button');
  updateQualityButton.type = 'button';
  updateQualityButton.textContent = 'Update quality';
  updateQualityButton.style.padding = '6px 10px';
  updateQualityButton.style.borderRadius = '6px';
  updateQualityButton.style.border = 'none';
  updateQualityButton.style.cursor = 'pointer';
  updateQualityButton.style.background = '#f59e0b';
  updateQualityButton.style.color = '#111827';
  applyDisabledStyles(updateQualityButton, true);
  qualityRow.appendChild(updateQualityButton);

  const tagsRow = document.createElement('div');
  tagsRow.style.marginTop = '8px';
  tagsRow.style.display = 'flex';
  tagsRow.style.flexDirection = 'column';
  tagsRow.style.gap = '6px';
  panel.appendChild(tagsRow);

  const tagsLabel = document.createElement('div');
  tagsLabel.textContent = 'Tags';
  tagsLabel.style.fontSize = '11px';
  tagsLabel.style.opacity = '0.8';
  tagsRow.appendChild(tagsLabel);

  const tagsSelect = document.createElement('select');
  tagsSelect.multiple = true;
  tagsSelect.style.padding = '6px';
  tagsSelect.style.borderRadius = '6px';
  tagsSelect.style.border = '1px solid #1f2937';
  tagsSelect.style.background = '#0b1220';
  tagsSelect.style.color = '#e2e8f0';
  tagsSelect.style.minHeight = '90px';
  tagsSelect.disabled = true;
  tagsRow.appendChild(tagsSelect);

  const tagsStatus = document.createElement('div');
  tagsStatus.style.fontSize = '11px';
  tagsStatus.style.opacity = '0.8';
  tagsStatus.textContent = 'Tags: unavailable';
  tagsRow.appendChild(tagsStatus);

  const updateTagsButton = document.createElement('button');
  updateTagsButton.type = 'button';
  updateTagsButton.textContent = 'Update tags';
  updateTagsButton.style.padding = '6px 10px';
  updateTagsButton.style.borderRadius = '6px';
  updateTagsButton.style.border = 'none';
  updateTagsButton.style.cursor = 'pointer';
  updateTagsButton.style.background = '#0ea5e9';
  updateTagsButton.style.color = '#ffffff';
  applyDisabledStyles(updateTagsButton, true);
  tagsRow.appendChild(updateTagsButton);

  const inputRow = document.createElement('div');
  inputRow.style.display = 'flex';
  inputRow.style.flexDirection = 'column';
  inputRow.style.gap = '6px';
  inputRow.style.marginTop = '8px';

  const statusRow = document.createElement('div');
  statusRow.style.marginTop = '8px';
  statusRow.style.fontSize = '11px';
  statusRow.style.opacity = '0.9';
  statusRow.textContent = 'Config: checking...';

  const openOptions = document.createElement('button');
  openOptions.type = 'button';
  openOptions.textContent = 'Open Options';
  openOptions.style.padding = '6px 10px';
  openOptions.style.borderRadius = '6px';
  openOptions.style.border = 'none';
  openOptions.style.cursor = 'pointer';
  openOptions.style.background = '#1f2937';
  openOptions.style.color = '#ffffff';

  openOptions.addEventListener('click', async () => {
    if (extContent.runtime.openOptionsPage) {
      extContent.runtime.openOptionsPage();
      return;
    }

    try {
      await extContent.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
    } catch (error) {
      console.warn('Open options failed:', error);
    }
  });

  inputRow.appendChild(statusRow);
  inputRow.appendChild(openOptions);
  panel.appendChild(inputRow);

  let readiness: 'unconfigured' | 'configured' | 'validated' = 'unconfigured';

  let currentMonitorState: boolean | null = null;

  const renderQualityOptions = (selectedId?: number) => {
    qualitySelect.innerHTML = '';
    for (const profile of qualityProfileCatalog) {
      const option = document.createElement('option');
      option.value = String(profile.id);
      option.textContent = profile.name;
      option.selected = selectedId === profile.id;
      qualitySelect.appendChild(option);
    }
  };

  const updateQualityControls = (sceneId?: string) => {
    const cached = sceneId ? statusCache.get(sceneId) : undefined;
    const exists = Boolean(cached?.exists);
    const selectedId = cached?.qualityProfileId;
    if (qualityProfileCatalog.length === 0) {
      qualityStatus.textContent = 'Quality: unavailable';
      applyDisabledStyles(updateQualityButton, true);
      qualitySelect.disabled = true;
      return;
    }
    renderQualityOptions(selectedId);
    if (!exists) {
      qualityStatus.textContent = 'Quality: scene not in Whisparr';
      applyDisabledStyles(updateQualityButton, true);
      qualitySelect.disabled = true;
      return;
    }
    qualitySelect.disabled = false;
    applyDisabledStyles(updateQualityButton, false);
    qualityStatus.textContent = 'Quality: ready';
  };

  const renderTagOptions = (selectedIds: number[]) => {
    tagsSelect.innerHTML = '';
    for (const tag of tagCatalog) {
      const option = document.createElement('option');
      option.value = String(tag.id);
      option.textContent = tag.label;
      option.selected = selectedIds.includes(tag.id);
      tagsSelect.appendChild(option);
    }
  };

  const updateTagControls = (sceneId?: string) => {
    const cached = sceneId ? statusCache.get(sceneId) : undefined;
    const exists = Boolean(cached?.exists);
    const selectedIds = cached?.tagIds ?? [];
    if (tagCatalog.length === 0) {
      tagsStatus.textContent = 'Tags: unavailable';
      applyDisabledStyles(updateTagsButton, true);
      tagsSelect.disabled = true;
      return;
    }
    renderTagOptions(selectedIds);
    if (!exists) {
      tagsStatus.textContent = 'Tags: scene not in Whisparr';
      applyDisabledStyles(updateTagsButton, true);
      tagsSelect.disabled = true;
      return;
    }
    tagsSelect.disabled = false;
    applyDisabledStyles(updateTagsButton, false);
    tagsStatus.textContent = 'Tags: ready';
  };

  const updateExcludeControls = (sceneId?: string) => {
    const cached = sceneId ? statusCache.get(sceneId) : undefined;
    if (!sceneId) {
      excludeToggle.textContent = 'Exclude';
      applyDisabledStyles(excludeToggle, true);
      return;
    }
    if (cached?.exists) {
      excludeToggle.textContent = cached.excluded ? 'Excluded' : 'Exclude';
      applyDisabledStyles(excludeToggle, true);
      return;
    }
    excludeToggle.textContent = cached?.excluded ? 'Unexclude' : 'Exclude';
    applyDisabledStyles(excludeToggle, false);
  };

  const loadCatalogs = async () => {
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'FETCH_DISCOVERY_CATALOGS',
        kind: 'whisparr',
      });
      if (response.ok && response.catalogs) {
        if (response.catalogs.tags) {
          tagCatalog = response.catalogs.tags;
        }
        if (response.catalogs.qualityProfiles) {
          qualityProfileCatalog = response.catalogs.qualityProfiles;
        }
        const sceneId = getParsedPage().stashIds[0];
        updateQualityControls(sceneId);
        updateTagControls(sceneId);
      }
    } catch {
      tagsStatus.textContent = 'Tags: unavailable';
      qualityStatus.textContent = 'Quality: unavailable';
    }
  };

  const applyActionState = (sceneId?: string) => {
    if (!sceneId) {
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, true);
      return;
    }
    const cached = statusCache.get(sceneId);
    if (cached?.exists) {
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, false);
      return;
    }
    applyDisabledStyles(addSceneButton, readiness !== 'validated');
    applyDisabledStyles(monitorToggle, true);
  };

  const updateSceneStatus = async (force = false) => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      sceneStatusRow.textContent = 'Scene status: unavailable';
      checkStatusButton.disabled = true;
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, true);
      applyDisabledStyles(excludeToggle, true);
      excludeToggle.textContent = 'Exclude';
      qualitySelect.disabled = true;
      applyDisabledStyles(updateQualityButton, true);
      qualityStatus.textContent = 'Quality: unavailable';
      currentMonitorState = null;
      return;
    }

    checkStatusButton.disabled = false;
    applyActionState(sceneId);

    if (!force) {
      const cached = statusCache.get(sceneId);
      if (cached) {
        sceneStatusRow.textContent = cached.excluded
          ? 'Scene status: excluded'
          : cached.exists
            ? `Scene status: already in Whisparr${cached.hasFile === false ? ' (no file)' : ''}`
            : 'Scene status: not in Whisparr';
        if (cached.exists) {
          applyDisabledStyles(addSceneButton, true);
          applyDisabledStyles(monitorToggle, false);
          if (typeof cached.monitored === 'boolean') {
            currentMonitorState = cached.monitored;
            monitorToggle.textContent = cached.monitored ? 'Unmonitor' : 'Monitor';
          }
          applyDisabledStyles(excludeToggle, true);
          excludeToggle.textContent = cached.excluded ? 'Excluded' : 'Exclude';
        } else {
          applyDisabledStyles(monitorToggle, true);
          applyDisabledStyles(excludeToggle, false);
          excludeToggle.textContent = cached.excluded ? 'Unexclude' : 'Exclude';
        }
        updateQualityControls(sceneId);
        updateTagControls(sceneId);
        updateExcludeControls(sceneId);
        return;
      }
    }

    if (inFlight.has(sceneId)) {
      return;
    }

    inFlight.add(sceneId);
    sceneStatusRow.textContent = 'Scene status: checking...';

    try {
      const response = await extContent.runtime.sendMessage({
        type: 'CHECK_SCENE_STATUS',
        stashdbSceneId: sceneId,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: error (${response.error ?? 'unknown'})`;
        statusCache.set(sceneId, { exists: false, error: response.error ?? 'unknown' });
        return;
      }

      const exists = Boolean(response.exists);
      statusCache.set(sceneId, {
        exists,
        whisparrId: response.whisparrId,
        title: response.title,
        hasFile: response.hasFile,
        monitored: response.monitored,
        tagIds: response.tagIds,
        qualityProfileId: response.qualityProfileId,
        excluded: response.excluded,
      });
      sceneStatusRow.textContent = response.excluded
        ? 'Scene status: excluded'
        : exists
          ? `Scene status: already in Whisparr${response.hasFile === false ? ' (no file)' : ''}`
          : 'Scene status: not in Whisparr';
      if (exists) {
        applyDisabledStyles(addSceneButton, true);
        applyDisabledStyles(monitorToggle, false);
        currentMonitorState =
          typeof response.monitored === 'boolean' ? response.monitored : null;
        if (currentMonitorState !== null) {
          monitorToggle.textContent = currentMonitorState ? 'Unmonitor' : 'Monitor';
        }
        applyDisabledStyles(excludeToggle, true);
        excludeToggle.textContent = response.excluded ? 'Excluded' : 'Exclude';
      } else {
        applyActionState(sceneId);
        currentMonitorState = null;
        applyDisabledStyles(excludeToggle, false);
        excludeToggle.textContent = response.excluded ? 'Unexclude' : 'Exclude';
      }
      updateQualityControls(sceneId);
      updateTagControls(sceneId);
      updateExcludeControls(sceneId);
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: error (${(error as Error).message})`;
    } finally {
      inFlight.delete(sceneId);
    }
  };

  const addScene = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      sceneStatusRow.textContent = 'Scene status: unavailable';
      return;
    }
    if (readiness !== 'validated') {
      sceneStatusRow.textContent = 'Scene status: config not validated';
      return;
    }
    applyDisabledStyles(addSceneButton, true);
    sceneStatusRow.textContent = 'Scene status: adding...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'ADD_SCENE',
        stashdbSceneId: sceneId,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: add failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(addSceneButton, false);
        return;
      }
      statusCache.set(sceneId, {
        exists: true,
        whisparrId: response.whisparrId,
      });
      currentMonitorState = true;
      monitorToggle.textContent = 'Unmonitor';
      sceneStatusRow.textContent = 'Scene status: already in Whisparr';
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, false);
      updateQualityControls(sceneId);
      updateTagControls(sceneId);
      void updateSceneStatus(true);
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: add failed (${(error as Error).message})`;
      applyDisabledStyles(addSceneButton, false);
    }
  };

  const updateMonitorState = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      return;
    }
    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !cached.whisparrId) {
      sceneStatusRow.textContent = 'Scene status: not in Whisparr';
      applyDisabledStyles(monitorToggle, true);
      return;
    }
    if (currentMonitorState === null) {
      sceneStatusRow.textContent = 'Scene status: monitor state unknown';
      return;
    }
    const nextState = !currentMonitorState;
    applyDisabledStyles(monitorToggle, true);
    sceneStatusRow.textContent = nextState ? 'Scene status: enabling monitor...' : 'Scene status: disabling monitor...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'SET_MONITOR_STATE',
        whisparrId: cached.whisparrId,
        monitored: nextState,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: monitor update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(monitorToggle, false);
        return;
      }
      const monitored =
        typeof response.monitored === 'boolean' ? response.monitored : nextState;
      currentMonitorState = monitored;
      cached.monitored = monitored;
      monitorToggle.textContent = monitored ? 'Unmonitor' : 'Monitor';
      applyDisabledStyles(monitorToggle, false);
      sceneStatusRow.textContent = 'Scene status: already in Whisparr';
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: monitor update failed (${(error as Error).message})`;
      applyDisabledStyles(monitorToggle, false);
    }
  };

  const updateExcludeState = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      return;
    }
    const cached = statusCache.get(sceneId);
    const nextExcluded = !Boolean(cached?.excluded);
    applyDisabledStyles(excludeToggle, true);
    excludeToggle.textContent = 'Working...';
    const runtime = extContent?.runtime;
    if (!runtime) {
      excludeToggle.textContent = nextExcluded ? 'Exclude' : 'Unexclude';
      applyDisabledStyles(excludeToggle, false);
      return;
    }
    try {
      const headerTitle =
        document.querySelector<HTMLHeadingElement>('.card-header h3 span')?.textContent?.trim() ??
        document.querySelector<HTMLHeadingElement>('.card-header h3')?.textContent?.trim();
      const response = await runtime.sendMessage({
        type: 'SCENE_CARD_SET_EXCLUDED',
        sceneId,
        excluded: nextExcluded,
        movieTitle: headerTitle || cached?.title,
        movieYear: undefined,
      });
      if (!response.ok) {
        excludeToggle.textContent = cached?.excluded ? 'Unexclude' : 'Exclude';
        applyDisabledStyles(excludeToggle, false);
        return;
      }
      statusCache.set(sceneId, {
        ...cached,
        exists: cached?.exists ?? false,
        excluded: response.excluded ?? nextExcluded,
      });
      updateExcludeControls(sceneId);
    } catch {
      excludeToggle.textContent = cached?.excluded ? 'Unexclude' : 'Exclude';
      applyDisabledStyles(excludeToggle, false);
    }
  };

  const updateQualityProfile = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) return;
    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !cached.whisparrId) {
      qualityStatus.textContent = 'Quality: scene not in Whisparr';
      applyDisabledStyles(updateQualityButton, true);
      return;
    }
    if (qualityProfileUpdateInFlight.has(sceneId)) {
      return;
    }
    const selectedId = Number(qualitySelect.value);
    if (!Number.isFinite(selectedId) || selectedId <= 0) {
      qualityStatus.textContent = 'Quality: select a profile';
      applyDisabledStyles(updateQualityButton, true);
      return;
    }
    qualityProfileUpdateInFlight.add(sceneId);
    applyDisabledStyles(updateQualityButton, true);
    qualityStatus.textContent = 'Quality: updating...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'UPDATE_QUALITY_PROFILE',
        whisparrId: cached.whisparrId,
        qualityProfileId: selectedId,
      });
      if (!response.ok) {
        qualityStatus.textContent = `Quality: update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(updateQualityButton, false);
        return;
      }
      cached.qualityProfileId = response.qualityProfileId ?? selectedId;
      qualityStatus.textContent = 'Quality: updated';
      applyDisabledStyles(updateQualityButton, false);
    } catch (error) {
      qualityStatus.textContent = `Quality: update failed (${(error as Error).message})`;
      applyDisabledStyles(updateQualityButton, false);
    } finally {
      qualityProfileUpdateInFlight.delete(sceneId);
    }
  };

  const updateTags = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) return;
    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !cached.whisparrId) {
      tagsStatus.textContent = 'Tags: scene not in Whisparr';
      applyDisabledStyles(updateTagsButton, true);
      return;
    }
    if (tagUpdateInFlight.has(sceneId)) {
      return;
    }
    tagUpdateInFlight.add(sceneId);
    applyDisabledStyles(updateTagsButton, true);
    tagsStatus.textContent = 'Tags: updating...';
    try {
      const selectedIds = Array.from(tagsSelect.selectedOptions)
        .map((opt) => Number(opt.value))
        .filter((val) => Number.isFinite(val));
      const response = await extContent.runtime.sendMessage({
        type: 'UPDATE_TAGS',
        whisparrId: cached.whisparrId,
        tagIds: selectedIds,
      });
      if (!response.ok) {
        tagsStatus.textContent = `Tags: update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(updateTagsButton, false);
        return;
      }
      cached.tagIds = response.tagIds ?? selectedIds;
      tagsStatus.textContent = 'Tags: updated';
      applyDisabledStyles(updateTagsButton, false);
    } catch (error) {
      tagsStatus.textContent = `Tags: update failed (${(error as Error).message})`;
      applyDisabledStyles(updateTagsButton, false);
    } finally {
      tagUpdateInFlight.delete(sceneId);
    }
  };

  checkStatusButton.addEventListener('click', () => {
    void updateSceneStatus(true);
  });

  addSceneButton.addEventListener('click', () => {
    void addScene();
  });

  monitorToggle.addEventListener('click', () => {
    void updateMonitorState();
  });

  excludeToggle.addEventListener('click', () => {
    void updateExcludeState();
  });

  qualitySelect.addEventListener('change', () => {
    applyDisabledStyles(updateQualityButton, false);
  });

  updateQualityButton.addEventListener('click', () => {
    void updateQualityProfile();
  });

  tagsSelect.addEventListener('change', () => {
    applyDisabledStyles(updateTagsButton, false);
  });

  updateTagsButton.addEventListener('click', () => {
    void updateTags();
  });

  const updateConfigStatus = async () => {
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });
      if (!response.ok || !response.settings) {
        statusRow.textContent = 'Config: unavailable';
        readiness = 'unconfigured';
        applyDisabledStyles(addSceneButton, true);
        return;
      }
      const baseUrl = response.settings.whisparrBaseUrl?.trim() ?? '';
      const apiKey = response.settings.whisparrApiKey?.trim() ?? '';
      const configured = Boolean(baseUrl && apiKey);
      if (!configured) {
        statusRow.textContent = 'Config: not configured';
        readiness = 'unconfigured';
        applyDisabledStyles(addSceneButton, true);
        return;
      }
      if (!response.settings.lastValidatedAt) {
        statusRow.textContent = 'Config: configured (not validated)';
        readiness = 'configured';
        applyDisabledStyles(addSceneButton, true);
        return;
      }
      const validatedAt = new Date(response.settings.lastValidatedAt);
      statusRow.textContent = `Config: validated ${validatedAt.toLocaleString()}`;
      readiness = 'validated';
      applyActionState(getParsedPage().stashIds[0]);
    } catch {
      statusRow.textContent = 'Config: unavailable';
      readiness = 'unconfigured';
      applyDisabledStyles(addSceneButton, true);
    }
  };

  void updateConfigStatus();
  void updateSceneStatus(false);
  void loadCatalogs();

  document.documentElement.appendChild(panel);

  let lastUrl = window.location.href;
  const checkNavigation = () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateDiagnostics();
      void updateSceneStatus(false);
    }
  };

  window.addEventListener('popstate', checkNavigation);
  window.setInterval(checkNavigation, 500);
}

type SceneCardData = { sceneId: string; sceneUrl: string };
type SceneCardMeta = { sceneId: string; sceneUrl: string; title?: string; year?: number };

class SceneCardObserver {
  // Dev checklist: missing indicator renders for hasFile=false, search triggers background, UI shows loading/success/error.
  private observer: MutationObserver | null = null;
  private debounceHandle: number | null = null;
  private injectedByCard = new Map<HTMLElement, HTMLElement>();
  private statusBySceneId = new Map<
    string,
    {
      exists: boolean;
      whisparrId?: number;
      monitored?: boolean;
      tagIds?: number[];
      hasFile?: boolean;
      excluded?: boolean;
      title?: string;
      year?: number;
      statusKnown?: boolean;
    }
  >();
  private statusIconBySceneId = new Map<string, HTMLElement>();
  private actionBySceneId = new Map<
    string,
    {
      button: HTMLButtonElement;
      setStatus: (
        state: 'loading' | 'in' | 'out' | 'excluded' | 'error' | 'missing',
      ) => void;
    }
  >();
  private excludeBySceneId = new Map<
    string,
    {
      button: HTMLButtonElement;
      setState: (state: 'idle' | 'loading' | 'error', excluded: boolean) => void;
    }
  >();
  private missingBySceneId = new Map<
    string,
    {
      wrap: HTMLElement;
      setState: (state: 'idle' | 'loading' | 'success' | 'error') => void;
    }
  >();
  private statusQueue = new Map<string, SceneCardMeta>();
  private statusDebounceHandle: number | null = null;
  private statusInFlight = false;

  start() {
    this.scan(document.body);
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        this.scheduleScan();
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private scheduleScan() {
    if (this.debounceHandle !== null) {
      window.clearTimeout(this.debounceHandle);
    }
    this.debounceHandle = window.setTimeout(() => {
      this.debounceHandle = null;
      this.scan(document.body);
    }, 150);
  }

  private scan(root: ParentNode) {
    this.cleanup();
    const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="/scenes/"]'));
    for (const anchor of anchors) {
      const scene = this.extractScene(anchor);
      if (!scene) continue;
      const card = this.findCardContainer(anchor);
      if (!card) continue;
      if (card.dataset.stasharrAugmented === 'true') continue;
      if (card.querySelector('.stasharr-scene-card')) {
        card.dataset.stasharrAugmented = 'true';
        continue;
      }
      const injected = this.injectControls(card, scene, anchor);
      if (injected) {
        card.dataset.stasharrAugmented = 'true';
        this.injectedByCard.set(card, injected);
      }
      const cached = this.statusBySceneId.get(scene.sceneId) ?? { exists: false };
      this.statusBySceneId.set(scene.sceneId, {
        ...cached,
        title: scene.title ?? cached.title,
        year: scene.year ?? cached.year,
        statusKnown: cached.statusKnown ?? false,
      });
      this.enqueueStatus(scene);
    }
  }

  private cleanup() {
    for (const [card, injected] of this.injectedByCard.entries()) {
      if (!card.isConnected) {
        injected.remove();
        this.injectedByCard.delete(card);
      }
    }
  }

  private extractScene(anchor: HTMLAnchorElement): SceneCardMeta | null {
    const href = anchor.getAttribute('href');
    if (!href) return null;
    let url: URL;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      return null;
    }
    const match = url.pathname.match(/^\/scenes\/([^/?#]+)/);
    if (!match) return null;
    const card = this.findCardContainer(anchor);
    let title: string | undefined;
    let year: number | undefined;
    if (card) {
      const titleEl =
        card.querySelector<HTMLHeadingElement>('.card-footer h6') ??
        card.querySelector<HTMLAnchorElement>('.card-footer a[title]') ??
        card.querySelector<HTMLAnchorElement>('.card-footer a');
      const rawTitle =
        titleEl?.getAttribute('title')?.trim() || titleEl?.textContent?.trim();
      if (rawTitle) {
        title = rawTitle;
      }
      const yearEl = card.querySelector<HTMLDivElement>('.card-footer strong');
      const rawYear = yearEl?.textContent?.trim();
      const yearMatch = rawYear?.match(/^(\d{4})/);
      if (yearMatch) {
        year = Number(yearMatch[1]);
      }
    }
    return { sceneId: match[1], sceneUrl: url.toString(), title, year };
  }

  private findCardContainer(anchor: HTMLAnchorElement): HTMLElement | null {
    const selectors = [
      '[class*="SceneCard"]',
      '[class*="Card"]',
      '[data-testid*="scene"]',
      'article',
      'li',
      '.card',
    ];
    for (const selector of selectors) {
      const match = anchor.closest(selector);
      if (match instanceof HTMLElement && match.tagName !== 'A') {
        return match;
      }
    }
    const fallback = anchor.closest('article, li, .card, [class*="Card"], [class*="SceneCard"], [data-testid*="scene"]');
    if (fallback instanceof HTMLElement && fallback.tagName !== 'A') {
      return fallback;
    }
    const explicit = anchor.closest('.SceneCard.card');
    if (explicit instanceof HTMLElement && explicit.tagName !== 'A') {
      return explicit;
    }
    return null;
  }

  private injectControls(card: HTMLElement, scene: SceneCardMeta, anchor: HTMLAnchorElement) {
    const container = document.createElement('div');
    container.className = 'stasharr-scene-card';
    container.style.display = 'flex';
    container.style.gap = '6px';
    container.style.alignItems = 'center';
    container.style.padding = '6px 10px';
    container.style.borderTop = '1px solid rgba(148, 163, 184, 0.25)';
    container.style.borderBottom = '1px solid rgba(148, 163, 184, 0.25)';
    container.style.background = 'rgba(15, 23, 42, 0.06)';
    container.style.color = '#0f172a';
    container.style.fontSize = '11px';

    const statusOverlay = document.createElement('div');
    statusOverlay.className = 'stasharr-scene-card-status';
    statusOverlay.style.position = 'absolute';
    statusOverlay.style.top = '6px';
    statusOverlay.style.right = '6px';
    statusOverlay.style.display = 'inline-flex';
    statusOverlay.style.alignItems = 'center';
    statusOverlay.style.justifyContent = 'center';
    statusOverlay.style.width = '26px';
    statusOverlay.style.height = '26px';
    statusOverlay.style.borderRadius = '999px';
    statusOverlay.style.background = 'rgba(15, 23, 42, 0.8)';
    statusOverlay.style.color = '#7138c8';
    statusOverlay.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.35)';

    const statusIcon = document.createElement('span');
    statusIcon.setAttribute('aria-hidden', 'true');
    statusIcon.style.display = 'inline-flex';
    statusIcon.style.alignItems = 'center';
    statusIcon.style.justifyContent = 'center';
    statusIcon.style.width = '16px';
    statusIcon.style.height = '16px';
    statusOverlay.appendChild(statusIcon);

    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.setAttribute('aria-label', 'Add to Whisparr');
    actionButton.style.border = '1px solid #7138c8';
    actionButton.style.borderRadius = '999px';
    actionButton.style.padding = '2px 8px';
    actionButton.style.cursor = 'pointer';
    actionButton.style.background = '#7138c8';
    actionButton.style.color = '#ffffff';
    actionButton.style.fontSize = '12px';
    actionButton.style.lineHeight = '1';
    actionButton.style.display = 'inline-flex';
    actionButton.style.alignItems = 'center';
    actionButton.style.justifyContent = 'center';
    actionButton.style.gap = '4px';
    actionButton.innerHTML = this.renderIcon('download');
    container.appendChild(actionButton);

    const missingWrap = document.createElement('div');
    missingWrap.dataset.stasharrMissing = 'true';
    missingWrap.style.display = 'none';
    missingWrap.style.alignItems = 'center';
    missingWrap.style.gap = '4px';
    container.appendChild(missingWrap);

    const searchButton = document.createElement('button');
    searchButton.type = 'button';
    searchButton.setAttribute('aria-label', 'Trigger Whisparr search');
    searchButton.title = 'Trigger Whisparr search';
    searchButton.style.border = '1px solid #f59e0b';
    searchButton.style.borderRadius = '999px';
    searchButton.style.padding = '2px 8px';
    searchButton.style.cursor = 'pointer';
    searchButton.style.background = '#f59e0b';
    searchButton.style.color = '#ffffff';
    searchButton.style.fontSize = '12px';
    searchButton.style.lineHeight = '1';
    searchButton.style.display = 'inline-flex';
    searchButton.style.alignItems = 'center';
    searchButton.style.justifyContent = 'center';
    searchButton.innerHTML = this.renderIcon('search');
    missingWrap.appendChild(searchButton);

    const excludeButton = document.createElement('button');
    excludeButton.type = 'button';
    excludeButton.setAttribute('aria-label', 'Exclude from Whisparr');
    excludeButton.title = 'Exclude from Whisparr';
    excludeButton.style.border = '1px solid #ef4444';
    excludeButton.style.borderRadius = '999px';
    excludeButton.style.padding = '2px 8px';
    excludeButton.style.cursor = 'pointer';
    excludeButton.style.background = '#ef4444';
    excludeButton.style.color = '#ffffff';
    excludeButton.style.fontSize = '12px';
    excludeButton.style.lineHeight = '1';
    excludeButton.style.display = 'inline-flex';
    excludeButton.style.alignItems = 'center';
    excludeButton.style.justifyContent = 'center';
    excludeButton.innerHTML = this.renderIcon('ban');
    excludeButton.disabled = true;
    excludeButton.style.opacity = '0.6';
    excludeButton.setAttribute('aria-label', 'Exclusion status loading');
    excludeButton.title = 'Exclusion status loading';
    container.appendChild(excludeButton);

    const setStatus = (
      state: 'loading' | 'in' | 'out' | 'excluded' | 'error' | 'missing',
    ) => {
      switch (state) {
        case 'loading':
          statusIcon.innerHTML = this.renderIcon('spinner', true);
          statusIcon.style.color = '#7138c8';
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.background = '#b9a2e8';
          actionButton.style.borderColor = '#b9a2e8';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Adding to Whisparr');
          return;
        case 'in':
          statusIcon.innerHTML = this.renderIcon('circle-check');
          statusIcon.style.color = '#16a34a';
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.background = '#b9a2e8';
          actionButton.style.borderColor = '#b9a2e8';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Already in Whisparr');
          return;
        case 'missing':
          statusIcon.innerHTML = this.renderIcon('warning');
          statusIcon.style.color = '#f59e0b';
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.background = '#b9a2e8';
          actionButton.style.borderColor = '#b9a2e8';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'In Whisparr (missing file)');
          return;
        case 'excluded':
          statusIcon.innerHTML = this.renderIcon('ban');
          statusIcon.style.color = '#ef4444';
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.setAttribute('aria-label', 'Excluded from Whisparr');
          return;
        case 'error':
          statusIcon.innerHTML = this.renderIcon('ban');
          statusIcon.style.color = '#ef4444';
          actionButton.disabled = false;
          actionButton.style.opacity = '1';
          actionButton.style.background = '#7138c8';
          actionButton.style.borderColor = '#7138c8';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Error, try again');
          return;
        case 'out':
        default:
          statusIcon.innerHTML = this.renderIcon('download');
          statusIcon.style.color = '#7138c8';
          actionButton.disabled = false;
          actionButton.style.opacity = '1';
          actionButton.style.background = '#7138c8';
          actionButton.style.borderColor = '#7138c8';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Add to Whisparr');
      }
    };

    const setMissingState = (state: 'idle' | 'loading' | 'success' | 'error') => {
      switch (state) {
        case 'loading':
          searchButton.disabled = true;
          searchButton.style.opacity = '0.6';
          searchButton.style.background = '#f3c46b';
          searchButton.style.borderColor = '#f3c46b';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = this.renderIcon('spinner', true);
          return;
        case 'success':
          searchButton.disabled = true;
          searchButton.style.opacity = '0.8';
          searchButton.style.background = '#f3c46b';
          searchButton.style.borderColor = '#f3c46b';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = this.renderIcon('circle-check');
          return;
        case 'error':
          searchButton.disabled = false;
          searchButton.style.opacity = '1';
          searchButton.style.background = '#f59e0b';
          searchButton.style.borderColor = '#f59e0b';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = this.renderIcon('x');
          return;
        case 'idle':
        default:
          searchButton.disabled = false;
          searchButton.style.opacity = '1';
          searchButton.style.background = '#f59e0b';
          searchButton.style.borderColor = '#f59e0b';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = this.renderIcon('search');
      }
    };

    const setExcludeState = (state: 'idle' | 'loading' | 'error', excluded: boolean) => {
      switch (state) {
        case 'loading':
          excludeButton.disabled = true;
          excludeButton.style.opacity = '0.6';
          excludeButton.innerHTML = this.renderIcon('spinner', true);
          return;
        case 'error':
          excludeButton.disabled = false;
          excludeButton.style.opacity = '1';
          excludeButton.innerHTML = this.renderIcon('x');
          return;
        case 'idle':
        default:
          excludeButton.disabled = false;
          excludeButton.style.opacity = '1';
          excludeButton.innerHTML = excluded ? this.renderIcon('circle-check') : this.renderIcon('ban');
          excludeButton.style.background = excluded ? '#9ca3af' : '#ef4444';
          excludeButton.style.borderColor = excluded ? '#9ca3af' : '#ef4444';
      }
    };

    setStatus('out');
    const cachedStatus = this.statusBySceneId.get(scene.sceneId);
    if (cachedStatus) {
      setStatus(cachedStatus.exists ? 'in' : 'out');
      if (cachedStatus.exists && cachedStatus.hasFile === false) {
        missingWrap.style.display = 'inline-flex';
        setMissingState('idle');
      } else if (cachedStatus.exists) {
        missingWrap.style.display = 'inline-flex';
        setMissingState('success');
      } else {
        missingWrap.style.display = 'none';
      }
      excludeButton.style.display = 'inline-flex';
      setExcludeState('idle', Boolean(cachedStatus.excluded));
      if (cachedStatus.exists) {
        excludeButton.disabled = true;
        excludeButton.style.opacity = '0.6';
        excludeButton.setAttribute(
          'aria-label',
          cachedStatus.excluded ? 'Excluded (managed outside Whisparr)' : 'Exclude (managed outside Whisparr)',
        );
        excludeButton.title = cachedStatus.excluded ? 'Excluded (managed outside Whisparr)' : 'Exclude (managed outside Whisparr)';
      } else {
        excludeButton.disabled = false;
        excludeButton.style.opacity = '1';
        excludeButton.setAttribute(
          'aria-label',
          cachedStatus.excluded ? 'Remove exclusion' : 'Exclude from Whisparr',
        );
        excludeButton.title = cachedStatus.excluded ? 'Remove exclusion' : 'Exclude from Whisparr';
      }
    }

    actionButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setStatus('loading');
      const runtime = extContent?.runtime;
      if (!runtime) {
        setStatus('error');
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_ADD',
          sceneId: scene.sceneId,
          sceneUrl: scene.sceneUrl,
        });
        setStatus(response.ok ? 'in' : 'error');
      } catch {
        setStatus('error');
      }
    });

    searchButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
    const cached = this.statusBySceneId.get(scene.sceneId);
      if (!cached?.whisparrId) {
        setMissingState('error');
        return;
      }
      setMissingState('loading');
      const runtime = extContent?.runtime;
      if (!runtime) {
        setMissingState('error');
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_TRIGGER_SEARCH',
          whisparrId: cached.whisparrId,
        });
        if (!response.ok) {
          setMissingState('error');
          return;
        }
        setMissingState('success');
        window.setTimeout(() => {
          this.statusQueue.set(scene.sceneId, scene);
          void this.flushStatusQueue();
        }, 8000);
      } catch {
        setMissingState('error');
      }
    });

    excludeButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cached = this.statusBySceneId.get(scene.sceneId);
      const nextExcluded = !Boolean(cached?.excluded);
      setExcludeState('loading', nextExcluded);
      const runtime = extContent?.runtime;
      if (!runtime) {
        setExcludeState('error', Boolean(cached?.excluded));
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_SET_EXCLUDED',
          sceneId: scene.sceneId,
          excluded: nextExcluded,
          movieTitle: cached?.title ?? scene.title,
          movieYear: cached?.year ?? scene.year,
        });
        if (!response.ok) {
          setExcludeState('error', Boolean(cached?.excluded));
          return;
        }
        if (cached) {
          cached.excluded = response.excluded ?? nextExcluded;
        }
        setExcludeState('idle', Boolean(cached?.excluded ?? nextExcluded));
        this.applyStatusResults([
          {
            sceneId: scene.sceneId,
            exists: cached?.exists ?? false,
            hasFile: cached?.hasFile,
            excluded: cached?.excluded ?? nextExcluded,
          },
        ]);
      } catch {
        setExcludeState('error', Boolean(cached?.excluded));
      }
    });

    container.dataset.sceneId = scene.sceneId;
    container.dataset.sceneStatus = 'out';

    const imageAnchor =
      card.querySelector<HTMLAnchorElement>('a.SceneCard-image') ?? anchor;
    if (imageAnchor) {
      const computed = window.getComputedStyle(imageAnchor);
      if (computed.position === 'static') {
        imageAnchor.style.position = 'relative';
      }
      if (!imageAnchor.querySelector('.stasharr-scene-card-status')) {
        imageAnchor.appendChild(statusOverlay);
      }
    } else {
      container.insertBefore(statusOverlay, container.firstChild);
    }

    this.statusIconBySceneId.set(scene.sceneId, statusIcon);
    this.actionBySceneId.set(scene.sceneId, { button: actionButton, setStatus });
    this.missingBySceneId.set(scene.sceneId, { wrap: missingWrap, setState: setMissingState });
    this.excludeBySceneId.set(scene.sceneId, { button: excludeButton, setState: setExcludeState });

    const footer =
      card.querySelector('.card-footer') ??
      card.querySelector('[class*="CardFooter"]') ??
      card.querySelector('[class*="Footer"]') ??
      card.querySelector('[data-testid*="footer"]');
    const body =
      card.querySelector('.SceneCard-body') ??
      card.querySelector('[class*="CardBody"]') ??
      card.querySelector('[class*="Body"]') ??
      card.querySelector('[data-testid*="body"]');
    if (body && body.parentElement === card) {
      card.insertBefore(container, body.nextSibling);
    } else if (footer && footer.parentElement === card) {
      card.insertBefore(container, footer);
    } else {
      card.appendChild(container);
    }
    return container;
  }

  private enqueueStatus(scene: SceneCardMeta) {
    const cached = this.statusBySceneId.get(scene.sceneId);
    if (cached?.statusKnown) {
      return;
    }
    this.statusQueue.set(scene.sceneId, scene);
    if (this.statusDebounceHandle !== null) {
      window.clearTimeout(this.statusDebounceHandle);
    }
    this.statusDebounceHandle = window.setTimeout(() => {
      this.statusDebounceHandle = null;
      void this.flushStatusQueue();
    }, 250);
  }

  private async flushStatusQueue() {
    if (this.statusInFlight) {
      return;
    }
    if (this.statusQueue.size === 0) {
      return;
    }
    const runtime = extContent?.runtime;
    if (!runtime) {
      return;
    }
    const items = Array.from(this.statusQueue.values());
    this.statusQueue.clear();
    this.statusInFlight = true;
    try {
      const response = await runtime.sendMessage({
        type: 'SCENE_CARDS_CHECK_STATUS',
        items,
      });
      if (!response.ok || !response.results) {
        this.applyStatusError(items.map((item) => item.sceneId));
        return;
      }
      for (const result of response.results) {
        const existing = this.statusBySceneId.get(result.sceneId);
        this.statusBySceneId.set(result.sceneId, {
          exists: result.exists,
          whisparrId: result.whisparrId,
          monitored: result.monitored,
          tagIds: result.tagIds,
          hasFile: result.hasFile,
          excluded: result.excluded,
          title: existing?.title,
          year: existing?.year,
          statusKnown: true,
        });
      }
      this.applyStatusResults(response.results);
    } catch {
      this.applyStatusError(items.map((item) => item.sceneId));
    } finally {
      this.statusInFlight = false;
    }
  }

  private applyStatusResults(
    results: Array<{ sceneId: string; exists: boolean; hasFile?: boolean; excluded?: boolean }>,
  ) {
    for (const result of results) {
      const action = this.actionBySceneId.get(result.sceneId);
      if (action) {
        if (result.excluded) {
          action.setStatus('excluded');
        } else if (result.exists && result.hasFile === false) {
          action.setStatus('missing');
        } else if (result.exists) {
          action.setStatus('in');
        } else {
          action.setStatus('out');
        }
      }
      const missing = this.missingBySceneId.get(result.sceneId);
      if (missing) {
        if (result.exists) {
          missing.wrap.style.display = 'inline-flex';
          if (result.hasFile === false) {
            missing.setState('idle');
          } else {
            missing.setState('success');
          }
        } else {
          missing.wrap.style.display = 'none';
        }
      }
      const exclude = this.excludeBySceneId.get(result.sceneId);
      if (exclude) {
        if (result.exists) {
          exclude.button.style.display = 'inline-flex';
          exclude.setState('idle', Boolean(result.excluded));
          exclude.button.disabled = true;
          exclude.button.style.opacity = '0.6';
          exclude.button.setAttribute(
            'aria-label',
            result.excluded ? 'Excluded (managed outside Whisparr)' : 'Exclude (managed outside Whisparr)',
          );
          exclude.button.title = result.excluded ? 'Excluded (managed outside Whisparr)' : 'Exclude (managed outside Whisparr)';
        } else {
          exclude.button.style.display = 'inline-flex';
          exclude.button.disabled = false;
          exclude.button.style.opacity = '1';
          exclude.setState('idle', Boolean(result.excluded));
          exclude.button.setAttribute(
            'aria-label',
            result.excluded ? 'Remove exclusion' : 'Exclude from Whisparr',
          );
          exclude.button.title = result.excluded ? 'Remove exclusion' : 'Exclude from Whisparr';
        }
      }
    }
  }

  private applyStatusError(sceneIds: string[]) {
    for (const sceneId of sceneIds) {
      const icon = this.statusIconBySceneId.get(sceneId);
      if (!icon) continue;
      icon.innerHTML = this.renderIcon('ban');
      icon.style.color = '#ef4444';
      const action = this.actionBySceneId.get(sceneId);
      if (action) {
        action.setStatus('error');
      }
      const exclude = this.excludeBySceneId.get(sceneId);
      if (exclude) {
        exclude.button.style.display = 'inline-flex';
        exclude.setState('error', false);
        exclude.button.disabled = true;
        exclude.button.style.opacity = '0.6';
        exclude.button.setAttribute('aria-label', 'Exclusion status unavailable');
        exclude.button.title = 'Exclusion status unavailable';
      }
    }
  }

  private findInjectedBySceneId(sceneId: string) {
    for (const node of this.injectedByCard.values()) {
      if (node.dataset.sceneId === sceneId) {
        return node;
      }
    }
    return null;
  }

  private ensureIconStyles() {
    if (document.getElementById('stasharr-fa-style')) return;
    const style = document.createElement('style');
    style.id = 'stasharr-fa-style';
    style.textContent = '@keyframes stasharr-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  private renderIcon(
    name: 'spinner' | 'circle-check' | 'download' | 'ban' | 'warning' | 'refresh' | 'x' | 'search',
    spin = false,
  ) {
    const paths: Record<typeof name, string> = {
      spinner: 'M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7V2z',
      'circle-check': 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm5 7-6 6-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9z',
      download: 'M12 3v9m0 0 4-4m-4 4-4-4M5 19h14',
      ban: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-6.2 5.8L18.2 18.2M18.2 5.8 5.8 18.2',
      warning: 'M12 3 1.5 21h21L12 3zm0 5.5 3.5 7H8.5L12 8.5zm-1 9.5h2v2h-2v-2z',
      refresh: 'M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.2L14 10h6V4l-2.3 2.3z',
      x: 'M6 6l12 12M18 6L6 18',
      search: 'M21 21l-4.3-4.3m1.3-5A7 7 0 1 1 10 4a7 7 0 0 1 8 7.7z',
    };
    this.ensureIconStyles();
    const spinStyle = spin ? 'animation: stasharr-spin 1s linear infinite;' : '';
    const strokeIcons =
      name === 'download' || name === 'ban' || name === 'refresh' || name === 'x' || name === 'search';
    if (strokeIcons) {
      return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block; color: currentColor; ${spinStyle}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"></path></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block; color: currentColor; ${spinStyle}" fill="currentColor"><path d="${paths[name]}"></path></svg>`;
  }
}

const sceneCardObserver = new SceneCardObserver();
sceneCardObserver.start();
