import { getSettings } from '../../shared/storage.js';

type ExtRuntimeBg = {
  permissions?: {
    contains: (details: { origins: string[] }) => Promise<boolean>;
  };
};

const extCandidate =
  (globalThis as typeof globalThis & { browser?: ExtRuntimeBg }).browser ??
  (globalThis as typeof globalThis & { chrome?: ExtRuntimeBg }).chrome;

if (!extCandidate) {
  throw new Error('Extension runtime not available.');
}
const ext = extCandidate;

const REQUEST_TIMEOUT_MS = 10_000;

type StashGraphqlError = {
  code:
    | 'missing_settings'
    | 'invalid_base_url'
    | 'missing_api_key'
    | 'permission_missing'
    | 'permissions_unavailable'
    | 'timeout'
    | 'network_error'
    | 'http_error'
    | 'parse_error'
    | 'graphql_error'
    | 'unknown';
  message: string;
  status?: number;
  details?: unknown;
};

export type StashGraphqlResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StashGraphqlError };

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

function hostOriginPattern(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return `${parsed.protocol}//${parsed.host}/*`;
}

function stashGraphqlEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/graphql')) {
    return trimmed;
  }
  return `${trimmed}/graphql`;
}

export async function stashGraphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<StashGraphqlResult<T>> {
  const settings = await getSettings();
  const normalized = normalizeBaseUrl(settings.stashBaseUrl ?? '');
  if (!normalized.ok || !normalized.value) {
    return {
      ok: false,
      error: {
        code: 'invalid_base_url',
        message: normalized.error ?? 'Invalid base URL.',
      },
    };
  }

  const apiKey = settings.stashApiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: false,
      error: { code: 'missing_api_key', message: 'API key is required.' },
    };
  }

  const origin = hostOriginPattern(normalized.value);
  if (!ext.permissions?.contains) {
    return {
      ok: false,
      error: {
        code: 'permissions_unavailable',
        message: 'Permissions API not available.',
      },
    };
  }
  const granted = await ext.permissions.contains({ origins: [origin] });
  if (!granted) {
    return {
      ok: false,
      error: { code: 'permission_missing', message: `Permission missing for ${origin}` },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(stashGraphqlEndpoint(normalized.value), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Stash GraphQL auth uses the ApiKey header (not X-Api-Key).
        ApiKey: apiKey,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'parse_error',
          message: `JSON parse error: ${(error as Error).message}`,
          status: response.status,
        },
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: 'http_error',
          message: `HTTP ${response.status}`,
          status: response.status,
          details: payload,
        },
      };
    }

    if (
      payload &&
      typeof payload === 'object' &&
      'errors' in payload &&
      Array.isArray((payload as { errors?: unknown }).errors)
    ) {
      const [firstError] = (payload as { errors: Array<{ message?: string }> }).errors;
      return {
        ok: false,
        error: {
          code: 'graphql_error',
          message: firstError?.message ?? 'GraphQL error',
          details: payload,
        },
      };
    }

    if (!payload || typeof payload !== 'object' || !('data' in payload)) {
      return {
        ok: false,
        error: { code: 'parse_error', message: 'Missing GraphQL data in response.' },
      };
    }

    return { ok: true, data: (payload as { data: T }).data };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return {
        ok: false,
        error: { code: 'timeout', message: 'Request timed out.' },
      };
    }
    return {
      ok: false,
      error: {
        code: 'network_error',
        message: `Network error: ${(error as Error).message}`,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
