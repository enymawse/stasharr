export const MESSAGE_TYPES = {
  ping: 'PING',
  fetchJson: 'FETCH_JSON',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type PingRequest = {
  type: typeof MESSAGE_TYPES.ping;
};

export type PingResponse = {
  ok: true;
  type: typeof MESSAGE_TYPES.ping;
  version: string;
  timestamp: string;
};

export type FetchJsonRequest = {
  type: typeof MESSAGE_TYPES.fetchJson;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export type FetchJsonResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.fetchJson;
  status?: number;
  json?: unknown;
  text?: string;
  error?: string;
};

export type ExtensionRequest = PingRequest | FetchJsonRequest;
export type ExtensionResponse = PingResponse | FetchJsonResponse;
