export const MESSAGE_TYPES = {
  ping: 'PING',
  fetchJson: 'FETCH_JSON',
  validateConnection: 'VALIDATE_CONNECTION',
  getSettings: 'GET_SETTINGS',
  getConfigStatus: 'GET_CONFIG_STATUS',
  saveSettings: 'SAVE_SETTINGS',
  resetSettings: 'RESET_SETTINGS',
  requestPermission: 'REQUEST_PERMISSION',
  getPermission: 'GET_PERMISSION',
  fetchDiscoveryCatalogs: 'FETCH_DISCOVERY_CATALOGS',
  saveSelections: 'SAVE_SELECTIONS',
  openOptionsPage: 'OPEN_OPTIONS_PAGE',
  checkSceneStatus: 'CHECK_SCENE_STATUS',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type PingRequest = { type: typeof MESSAGE_TYPES.ping };
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

export type ValidateConnectionRequest = {
  type: typeof MESSAGE_TYPES.validateConnection;
  baseUrl: string;
  apiKey: string;
  kind: 'whisparr';
};

export type ValidateConnectionResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.validateConnection;
  status?: number;
  data?: unknown;
  error?: string;
};

export type DiscoveryKind = 'whisparr';

export type QualityProfileItem = { id: number; name: string };
export type RootFolderItem = { id?: number; path: string };
export type TagItem = { id: number; label: string };

export type DiscoveryCatalogs = {
  qualityProfiles: QualityProfileItem[];
  rootFolders: RootFolderItem[];
  tags: TagItem[];
  fetchedAt?: string;
};

export type DiscoverySelections = {
  qualityProfileId: number | null;
  rootFolderPath: string | null;
  tagIds: number[];
};

export type DiscoverySelectionsForUi = {
  qualityProfileId: number | null;
  rootFolderPath: string | null;
  labelIds: number[];
};

export type FetchDiscoveryCatalogsRequest = {
  type: typeof MESSAGE_TYPES.fetchDiscoveryCatalogs;
  kind: DiscoveryKind;
  force?: boolean;
  baseUrl?: string;
  apiKey?: string;
};

export type FetchDiscoveryCatalogsResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.fetchDiscoveryCatalogs;
  catalogs?: DiscoveryCatalogs;
  selections?: DiscoverySelectionsForUi;
  errors?: {
    qualityProfiles?: string;
    rootFolders?: string;
    tags?: string;
    permission?: string;
    settings?: string;
  };
  invalidSelections?: {
    qualityProfileId?: boolean;
    rootFolderPath?: boolean;
    labelsRemoved?: number;
  };
};

export type GetSettingsRequest = { type: typeof MESSAGE_TYPES.getSettings };
export type GetConfigStatusRequest = { type: typeof MESSAGE_TYPES.getConfigStatus };
export type SaveSettingsRequest = {
  type: typeof MESSAGE_TYPES.saveSettings;
  settings: Partial<ExtensionSettings>;
};
export type ResetSettingsRequest = { type: typeof MESSAGE_TYPES.resetSettings };

export type RequestPermissionRequest = {
  type: typeof MESSAGE_TYPES.requestPermission;
  origin: string;
};
export type RequestPermissionResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.requestPermission;
  granted: boolean;
  error?: string;
};
export type GetPermissionRequest = {
  type: typeof MESSAGE_TYPES.getPermission;
  origin: string;
};
export type GetPermissionResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.getPermission;
  granted: boolean;
  error?: string;
};

export type OpenOptionsPageRequest = { type: typeof MESSAGE_TYPES.openOptionsPage };
export type OpenOptionsPageResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.openOptionsPage;
  error?: string;
};

export type CheckSceneStatusRequest = {
  type: typeof MESSAGE_TYPES.checkSceneStatus;
  stashdbSceneId: string;
};

export type CheckSceneStatusResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.checkSceneStatus;
  exists: boolean;
  whisparrId?: number;
  title?: string;
  hasFile?: boolean;
  error?: string;
};

export type SaveSelectionsRequest = {
  type: typeof MESSAGE_TYPES.saveSelections;
  selections: {
    kind: DiscoveryKind;
    qualityProfileId: number | null;
    rootFolderPath: string | null;
    labelIds: number[];
  };
};

export type SaveSelectionsResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.saveSelections;
  selections?: DiscoverySelectionsForUi;
  error?: string;
};

export type ExtensionSettings = {
  whisparrBaseUrl: string;
  whisparrApiKey: string;
  stashBaseUrl?: string;
  stashApiKey?: string;
  lastValidatedAt?: string;
};

export type ExtensionRequest =
  | PingRequest
  | FetchJsonRequest
  | ValidateConnectionRequest
  | GetSettingsRequest
  | GetConfigStatusRequest
  | SaveSettingsRequest
  | ResetSettingsRequest
  | RequestPermissionRequest
  | GetPermissionRequest
  | FetchDiscoveryCatalogsRequest
  | SaveSelectionsRequest
  | OpenOptionsPageRequest
  | CheckSceneStatusRequest;

export type ExtensionResponse =
  | PingResponse
  | FetchJsonResponse
  | ValidateConnectionResponse
  | { ok: true; type: typeof MESSAGE_TYPES.getSettings; settings: ExtensionSettings }
  | { ok: true; type: typeof MESSAGE_TYPES.getConfigStatus; configured: boolean }
  | { ok: true; type: typeof MESSAGE_TYPES.saveSettings; settings: ExtensionSettings }
  | { ok: true; type: typeof MESSAGE_TYPES.resetSettings }
  | RequestPermissionResponse
  | GetPermissionResponse
  | FetchDiscoveryCatalogsResponse
  | SaveSelectionsResponse
  | OpenOptionsPageResponse
  | CheckSceneStatusResponse
  | { ok: false; type: MessageType; error: string };
