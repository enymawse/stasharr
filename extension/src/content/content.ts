const MESSAGE_TYPES_CONTENT = {
  getConfigStatus: 'GET_CONFIG_STATUS',
} as const;

type GetConfigStatusRequest = { type: typeof MESSAGE_TYPES_CONTENT.getConfigStatus };
type GetSettingsRequest = { type: 'GET_SETTINGS' };
type OpenOptionsPageRequest = { type: 'OPEN_OPTIONS_PAGE' };
type CheckSceneStatusRequest = { type: 'CHECK_SCENE_STATUS'; stashdbSceneId: string };
type AddSceneRequest = { type: 'ADD_SCENE'; stashdbSceneId: string };
type SetMonitorStateRequest = { type: 'SET_MONITOR_STATE'; whisparrId: number; monitored: boolean };

type ContentRuntime = {
  runtime: {
    sendMessage: (
      message:
        | GetConfigStatusRequest
        | GetSettingsRequest
        | OpenOptionsPageRequest
        | CheckSceneStatusRequest
        | AddSceneRequest
        | SetMonitorStateRequest,
    ) => Promise<{
      ok: boolean;
      configured?: boolean;
      settings?: {
        whisparrBaseUrl?: string;
        whisparrApiKey?: string;
        lastValidatedAt?: string;
      };
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
      error?: string;
    }
  >();
  const inFlight = new Set<string>();

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
  addSceneButton.disabled = true;
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
  monitorToggle.disabled = true;
  actionRow.appendChild(monitorToggle);

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

  const updateSceneStatus = async (force = false) => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      sceneStatusRow.textContent = 'Scene status: unavailable';
      checkStatusButton.disabled = true;
      addSceneButton.disabled = true;
      monitorToggle.disabled = true;
      currentMonitorState = null;
      return;
    }

    checkStatusButton.disabled = false;
    addSceneButton.disabled = readiness !== 'validated';
    monitorToggle.disabled = true;

    if (!force) {
      const cached = statusCache.get(sceneId);
      if (cached) {
        sceneStatusRow.textContent = cached.exists
          ? `Scene status: already in Whisparr${cached.hasFile === false ? ' (no file)' : ''}`
          : 'Scene status: not in Whisparr';
        if (cached.exists) {
          addSceneButton.disabled = true;
          monitorToggle.disabled = false;
          if (typeof cached.monitored === 'boolean') {
            currentMonitorState = cached.monitored;
            monitorToggle.textContent = cached.monitored ? 'Unmonitor' : 'Monitor';
          }
        }
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
      });
      sceneStatusRow.textContent = exists
        ? `Scene status: already in Whisparr${response.hasFile === false ? ' (no file)' : ''}`
        : 'Scene status: not in Whisparr';
      if (exists) {
        addSceneButton.disabled = true;
        monitorToggle.disabled = false;
        currentMonitorState =
          typeof response.monitored === 'boolean' ? response.monitored : null;
        if (currentMonitorState !== null) {
          monitorToggle.textContent = currentMonitorState ? 'Unmonitor' : 'Monitor';
        }
      } else {
        addSceneButton.disabled = readiness !== 'validated';
        monitorToggle.disabled = true;
        currentMonitorState = null;
      }
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
    addSceneButton.disabled = true;
    sceneStatusRow.textContent = 'Scene status: adding...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'ADD_SCENE',
        stashdbSceneId: sceneId,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: add failed (${response.error ?? 'unknown'})`;
        addSceneButton.disabled = false;
        return;
      }
      statusCache.set(sceneId, {
        exists: true,
        whisparrId: response.whisparrId,
      });
      currentMonitorState = true;
      monitorToggle.textContent = 'Unmonitor';
      sceneStatusRow.textContent = 'Scene status: already in Whisparr';
      addSceneButton.disabled = true;
      monitorToggle.disabled = false;
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: add failed (${(error as Error).message})`;
      addSceneButton.disabled = false;
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
      monitorToggle.disabled = true;
      return;
    }
    if (currentMonitorState === null) {
      sceneStatusRow.textContent = 'Scene status: monitor state unknown';
      return;
    }
    const nextState = !currentMonitorState;
    monitorToggle.disabled = true;
    sceneStatusRow.textContent = nextState ? 'Scene status: enabling monitor...' : 'Scene status: disabling monitor...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'SET_MONITOR_STATE',
        whisparrId: cached.whisparrId,
        monitored: nextState,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: monitor update failed (${response.error ?? 'unknown'})`;
        monitorToggle.disabled = false;
        return;
      }
      const monitored =
        typeof response.monitored === 'boolean' ? response.monitored : nextState;
      currentMonitorState = monitored;
      cached.monitored = monitored;
      monitorToggle.textContent = monitored ? 'Unmonitor' : 'Monitor';
      monitorToggle.disabled = false;
      sceneStatusRow.textContent = 'Scene status: already in Whisparr';
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: monitor update failed (${(error as Error).message})`;
      monitorToggle.disabled = false;
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

  const updateConfigStatus = async () => {
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });
      if (!response.ok || !response.settings) {
        statusRow.textContent = 'Config: unavailable';
        readiness = 'unconfigured';
        addSceneButton.disabled = true;
        return;
      }
      const baseUrl = response.settings.whisparrBaseUrl?.trim() ?? '';
      const apiKey = response.settings.whisparrApiKey?.trim() ?? '';
      const configured = Boolean(baseUrl && apiKey);
      if (!configured) {
        statusRow.textContent = 'Config: not configured';
        readiness = 'unconfigured';
        addSceneButton.disabled = true;
        return;
      }
      if (!response.settings.lastValidatedAt) {
        statusRow.textContent = 'Config: configured (not validated)';
        readiness = 'configured';
        addSceneButton.disabled = true;
        return;
      }
      const validatedAt = new Date(response.settings.lastValidatedAt);
      statusRow.textContent = `Config: validated ${validatedAt.toLocaleString()}`;
      readiness = 'validated';
      addSceneButton.disabled = false;
    } catch {
      statusRow.textContent = 'Config: unavailable';
      readiness = 'unconfigured';
      addSceneButton.disabled = true;
    }
  };

  void updateConfigStatus();
  void updateSceneStatus(false);

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
