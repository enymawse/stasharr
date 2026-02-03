const MESSAGE_TYPES_BG = {
  ping: 'PING',
  fetchJson: 'FETCH_JSON',
} as const;

type PingRequestBg = { type: typeof MESSAGE_TYPES_BG.ping };
type PingResponseBg = {
  ok: true;
  type: typeof MESSAGE_TYPES_BG.ping;
  version: string;
  timestamp: string;
};

type FetchJsonRequestBg = {
  type: typeof MESSAGE_TYPES_BG.fetchJson;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type FetchJsonResponseBg = {
  ok: boolean;
  type: typeof MESSAGE_TYPES_BG.fetchJson;
  status?: number;
  json?: unknown;
  text?: string;
  error?: string;
};

type ExtensionRequestBg = PingRequestBg | FetchJsonRequestBg;
type ExtensionResponseBg = PingResponseBg | FetchJsonResponseBg;

type ExtRuntimeBg = {
  runtime: {
    onMessage: {
      addListener: (
        callback: (
          request: ExtensionRequestBg,
          sender: unknown,
          sendResponse: (response: ExtensionResponseBg) => void,
        ) => void,
      ) => void;
    };
  };
};

const ext =
  (
    globalThis as typeof globalThis & {
      browser?: ExtRuntimeBg;
      chrome?: ExtRuntimeBg;
    }
  ).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtRuntimeBg }).chrome;

if (!ext) {
  throw new Error('Extension runtime not available.');
}
const VERSION = '0.1.0';
const REQUEST_TIMEOUT_MS = 10_000;

async function handleFetchJson(
  request: ExtensionRequestBg,
): Promise<FetchJsonResponseBg> {
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

ext.runtime.onMessage.addListener(
  (
    request: ExtensionRequestBg,
    _sender: unknown,
    sendResponse: (response: ExtensionResponseBg) => void,
  ) => {
    const respond = async (): Promise<ExtensionResponseBg> => {
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
