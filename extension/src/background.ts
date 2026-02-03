import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type ExtensionResponse,
  type FetchJsonResponse,
} from './shared/messages';

type ExtRuntime = {
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
    sendMessage: (message: ExtensionRequest) => Promise<ExtensionResponse>;
  };
};

const ext = (globalThis as typeof globalThis & { browser?: ExtRuntime; chrome?: ExtRuntime }).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtRuntime }).chrome;

if (!ext) {
  throw new Error('Extension runtime not available.');
}
const VERSION = '0.1.0';
const REQUEST_TIMEOUT_MS = 10_000;

async function handleFetchJson(request: ExtensionRequest): Promise<FetchJsonResponse> {
  if (request.type !== MESSAGE_TYPES.fetchJson) {
    return { ok: false, type: MESSAGE_TYPES.fetchJson, error: 'Invalid request type' };
  }

  const { url, method, headers, body } = request;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
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

ext.runtime.onMessage.addListener((request: ExtensionRequest, _sender: unknown, sendResponse: (response: ExtensionResponse) => void) => {
  const respond = async (): Promise<ExtensionResponse> => {
    if (request?.type === MESSAGE_TYPES.ping) {
      return {
        ok: true,
        type: MESSAGE_TYPES.ping,
        version: VERSION,
        timestamp: new Date().toISOString(),
      };
    }

    if (request?.type === MESSAGE_TYPES.fetchJson) {
      return handleFetchJson(request);
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
