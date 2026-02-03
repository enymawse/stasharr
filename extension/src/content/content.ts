const MESSAGE_TYPES_CONTENT = {
  getConfigStatus: 'GET_CONFIG_STATUS',
} as const;

type GetConfigStatusRequest = { type: typeof MESSAGE_TYPES_CONTENT.getConfigStatus };
type GetSettingsRequest = { type: 'GET_SETTINGS' };
type OpenOptionsPageRequest = { type: 'OPEN_OPTIONS_PAGE' };

type ContentRuntime = {
  runtime: {
    sendMessage: (
      message: GetConfigStatusRequest | GetSettingsRequest | OpenOptionsPageRequest,
    ) => Promise<{
      ok: boolean;
      configured?: boolean;
      settings?: {
        whisparrBaseUrl?: string;
        whisparrApiKey?: string;
        lastValidatedAt?: string;
      };
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

  const updateConfigStatus = async () => {
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });
      if (!response.ok || !response.settings) {
        statusRow.textContent = 'Config: unavailable';
        return;
      }
      const baseUrl = response.settings.whisparrBaseUrl?.trim() ?? '';
      const apiKey = response.settings.whisparrApiKey?.trim() ?? '';
      const configured = Boolean(baseUrl && apiKey);
      if (!configured) {
        statusRow.textContent = 'Config: not configured';
        return;
      }
      if (!response.settings.lastValidatedAt) {
        statusRow.textContent = 'Config: configured (not validated)';
        return;
      }
      const validatedAt = new Date(response.settings.lastValidatedAt);
      statusRow.textContent = `Config: validated ${validatedAt.toLocaleString()}`;
    } catch {
      statusRow.textContent = 'Config: unavailable';
    }
  };

  void updateConfigStatus();

  document.documentElement.appendChild(panel);

  let lastUrl = window.location.href;
  const checkNavigation = () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateDiagnostics();
    }
  };

  window.addEventListener('popstate', checkNavigation);
  window.setInterval(checkNavigation, 500);
}
