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
type SceneCardActionRequestedRequest = {
  type: 'SCENE_CARD_ACTION_REQUESTED';
  sceneId: string;
  sceneUrl: string;
  action: 'stub_add';
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
        | SceneCardActionRequestedRequest,
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
  applyDisabledStyles(addSceneButton, true);
  actionRow.appendChild(addSceneButton);

  const monitorToggle = document.createElement('button');
  monitorToggle.type = 'button';
  monitorToggle.textContent = 'Monitor';
  monitorToggle.style.padding = '6px 10px';
  monitorToggle.style.borderRadius = '6px';
  monitorToggle.style.border = 'none';
  monitorToggle.style.cursor = 'pointer';
  monitorToggle.style.background = '#7c3aed';
  monitorToggle.style.color = '#ffffff';
  applyDisabledStyles(monitorToggle, true);
  actionRow.appendChild(monitorToggle);

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
        sceneStatusRow.textContent = cached.exists
          ? `Scene status: already in Whisparr${cached.hasFile === false ? ' (no file)' : ''}`
          : 'Scene status: not in Whisparr';
        if (cached.exists) {
          applyDisabledStyles(addSceneButton, true);
          applyDisabledStyles(monitorToggle, false);
          if (typeof cached.monitored === 'boolean') {
            currentMonitorState = cached.monitored;
            monitorToggle.textContent = cached.monitored ? 'Unmonitor' : 'Monitor';
          }
        } else {
          applyDisabledStyles(monitorToggle, true);
        }
        updateQualityControls(sceneId);
        updateTagControls(sceneId);
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
      });
      sceneStatusRow.textContent = exists
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
      } else {
        applyActionState(sceneId);
        currentMonitorState = null;
      }
      updateQualityControls(sceneId);
      updateTagControls(sceneId);
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

class SceneCardObserver {
  private observer: MutationObserver | null = null;
  private debounceHandle: number | null = null;
  private injectedByCard = new Map<HTMLElement, HTMLElement>();

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
      const injected = this.injectControls(card, scene);
      if (injected) {
        card.dataset.stasharrAugmented = 'true';
        this.injectedByCard.set(card, injected);
      }
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

  private extractScene(anchor: HTMLAnchorElement): SceneCardData | null {
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
    return { sceneId: match[1], sceneUrl: url.toString() };
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
      if (match instanceof HTMLElement) {
        return match;
      }
    }
    return anchor.closest('article, li, .card, [class*="Card"], [class*="SceneCard"], [data-testid*="scene"]');
  }

  private injectControls(card: HTMLElement, scene: SceneCardData) {
    const container = document.createElement('div');
    container.className = 'stasharr-scene-card';
    container.style.display = 'flex';
    container.style.gap = '6px';
    container.style.alignItems = 'center';
    container.style.padding = '6px 8px';
    container.style.borderTop = '1px solid rgba(148, 163, 184, 0.2)';
    container.style.borderBottom = '1px solid rgba(148, 163, 184, 0.2)';
    container.style.background = 'rgba(15, 23, 42, 0.04)';
    container.style.color = '#0f172a';
    container.style.fontSize = '11px';

    const badge = document.createElement('span');
    badge.textContent = 'Stasharr';
    badge.style.fontWeight = '600';
    container.appendChild(badge);

    const status = document.createElement('span');
    status.textContent = 'unknown';
    status.style.opacity = '0.85';
    container.appendChild(status);

    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.textContent = '+';
    actionButton.style.border = 'none';
    actionButton.style.borderRadius = '4px';
    actionButton.style.padding = '2px 6px';
    actionButton.style.cursor = 'pointer';
    actionButton.style.background = '#22c55e';
    actionButton.style.color = '#0b1220';
    container.appendChild(actionButton);

    actionButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      status.textContent = 'clicked';
      const runtime = extContent?.runtime;
      if (!runtime) {
        status.textContent = 'error';
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_ACTION_REQUESTED',
          sceneId: scene.sceneId,
          sceneUrl: scene.sceneUrl,
          action: 'stub_add',
        });
        status.textContent = response.ok ? 'ok' : 'error';
      } catch {
        status.textContent = 'error';
      }
    });

    const footer =
      card.querySelector('[class*="CardFooter"]') ??
      card.querySelector('[class*="Footer"]') ??
      card.querySelector('[data-testid*="footer"]');
    const body =
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
}

const sceneCardObserver = new SceneCardObserver();
sceneCardObserver.start();
