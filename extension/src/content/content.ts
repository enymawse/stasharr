const MESSAGE_TYPES_CONTENT = {
  ping: 'PING',
  fetchJson: 'FETCH_JSON',
} as const;

type FetchJsonRequest = {
  type: typeof MESSAGE_TYPES_CONTENT.fetchJson;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type FetchJsonResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES_CONTENT.fetchJson;
  status?: number;
  json?: unknown;
  text?: string;
  error?: string;
};

type ExtRuntime = {
  runtime: {
    sendMessage: (message: FetchJsonRequest) => Promise<FetchJsonResponse>;
  };
};

const PANEL_ID = 'stasharr-extension-panel';
const extContent =
  (globalThis as typeof globalThis & { browser?: ExtRuntime; chrome?: ExtRuntime }).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtRuntime }).chrome;

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

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'LAN API URL (background only)';
  urlInput.value = '';
  urlInput.style.padding = '6px 8px';
  urlInput.style.borderRadius = '6px';
  urlInput.style.border = '1px solid rgba(255,255,255,0.2)';
  urlInput.style.background = 'rgba(255,255,255,0.08)';
  urlInput.style.color = '#f5f5f5';

  const apiKeyInput = document.createElement('input');
  apiKeyInput.type = 'password';
  apiKeyInput.placeholder = 'API key (optional)';
  apiKeyInput.style.padding = '6px 8px';
  apiKeyInput.style.borderRadius = '6px';
  apiKeyInput.style.border = '1px solid rgba(255,255,255,0.2)';
  apiKeyInput.style.background = 'rgba(255,255,255,0.08)';
  apiKeyInput.style.color = '#f5f5f5';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Test Fetch (background)';
  button.style.padding = '6px 10px';
  button.style.borderRadius = '6px';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.background = '#3b82f6';
  button.style.color = '#ffffff';

  const results = document.createElement('div');
  results.style.marginTop = '6px';
  results.style.fontSize = '11px';
  results.style.opacity = '0.9';
  results.textContent = 'Results: awaiting request.';

  button.addEventListener('click', async () => {
    results.textContent = 'Results: sending request...';

    const headers: Record<string, string> = {};
    if (apiKeyInput.value.trim().length > 0) {
      headers['X-Api-Key'] = apiKeyInput.value.trim();
    }

    const response = (await extContent.runtime.sendMessage({
      type: MESSAGE_TYPES_CONTENT.fetchJson,
      url: urlInput.value.trim(),
      headers,
    })) as FetchJsonResponse;

    if (!response) {
      results.textContent = 'Results: no response from background.';
      return;
    }

    const status = response.status ? `status ${response.status}` : 'status unknown';
    if (response.ok) {
      const body = response.json ? JSON.stringify(response.json) : response.text ?? '';
      results.textContent = `Results: ok (${status}) • ${truncate(body)}`;
    } else {
      const body = response.text ? ` • ${truncate(response.text)}` : '';
      results.textContent = `Results: error (${status}) • ${response.error ?? 'unknown'}${body}`;
    }
  });

  inputRow.appendChild(urlInput);
  inputRow.appendChild(apiKeyInput);
  inputRow.appendChild(button);
  inputRow.appendChild(results);
  panel.appendChild(inputRow);

  document.documentElement.appendChild(panel);
}
