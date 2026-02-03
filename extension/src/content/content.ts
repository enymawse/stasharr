const MESSAGE_TYPES_CONTENT = {
  getConfigStatus: 'GET_CONFIG_STATUS',
} as const;

type GetConfigStatusRequest = { type: typeof MESSAGE_TYPES_CONTENT.getConfigStatus };

type ContentRuntime = {
  runtime: {
    sendMessage: (message: GetConfigStatusRequest) => Promise<{
      ok: boolean;
      configured?: boolean;
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
  const url = window.location.href;
  const path = window.location.pathname;
  let pageType = 'other';

  if (path.startsWith('/scenes/')) {
    pageType = 'scene';
  } else if (path.startsWith('/studios/')) {
    pageType = 'studio';
  } else if (path.startsWith('/performers/')) {
    pageType = 'performer';
  }

  diagnostics.textContent = `Diagnostics: ${pageType} • ${url}`;
  diagnostics.style.opacity = '0.85';
  panel.appendChild(diagnostics);

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

    const url = extContent.runtime.getURL
      ? (extContent.runtime.getURL('content/options.html') as string)
      : 'content/options.html';
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  inputRow.appendChild(statusRow);
  inputRow.appendChild(openOptions);
  panel.appendChild(inputRow);

  extContent.runtime
    .sendMessage({ type: MESSAGE_TYPES_CONTENT.getConfigStatus })
    .then((response) => {
      if (response.ok && response.configured) {
        statusRow.textContent = 'Config: configured';
      } else {
        statusRow.textContent = 'Config: not configured';
      }
    })
    .catch(() => {
      statusRow.textContent = 'Config: unavailable';
    });

  document.documentElement.appendChild(panel);
}
