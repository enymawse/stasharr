import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type FetchJsonResponse,
} from '../shared/messages.js';

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export type FetchResult = {
  ok: boolean;
  status?: number;
  json?: unknown;
  text?: string;
  error?: string;
};

type FetchOptions = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

export async function fetchWithTimeout({
  url,
  method,
  headers,
  body,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: FetchOptions): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
          status: response.status,
          error: `JSON parse error: ${(error as Error).message}`,
        };
      }
    } else {
      text = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      json,
      text,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { ok: false, error: 'Timeout' };
    }

    return {
      ok: false,
      error: `Network error: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleFetchJson(
  request: ExtensionRequest,
): Promise<FetchJsonResponse> {
  if (request.type !== MESSAGE_TYPES.fetchJson) {
    return {
      ok: false,
      type: MESSAGE_TYPES.fetchJson,
      error: 'Invalid request type',
    };
  }

  const { url, method, headers, body } = request;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DEFAULT_REQUEST_TIMEOUT_MS,
  );

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
