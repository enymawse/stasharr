import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type ExtensionResponse,
  type FetchJsonResponse,
  type ValidateConnectionResponse,
} from '../shared/messages';
import { getSettings, resetSettings, saveSettings } from '../shared/storage';

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
