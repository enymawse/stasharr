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
  addScene: 'ADD_SCENE',
  setMonitorState: 'SET_MONITOR_STATE',
  updateTags: 'UPDATE_TAGS',
  updateQualityProfile: 'UPDATE_QUALITY_PROFILE',
  sceneCardActionRequested: 'SCENE_CARD_ACTION_REQUESTED',
  sceneCardsCheckStatus: 'SCENE_CARDS_CHECK_STATUS',
  sceneCardAdd: 'SCENE_CARD_ADD',
  sceneCardTriggerSearch: 'SCENE_CARD_TRIGGER_SEARCH',
  sceneCardSetExcluded: 'SCENE_CARD_SET_EXCLUDED',
  stashFindSceneByStashdbId: 'STASH_FIND_SCENE_BY_STASHDB_ID',
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
  kind: 'whisparr' | 'stash';
  baseUrl?: string;
  apiKey?: string;
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
  monitored?: boolean;
  tagIds?: number[];
  qualityProfileId?: number;
  excluded?: boolean;
  error?: string;
};

export type AddSceneRequest = {
  type: typeof MESSAGE_TYPES.addScene;
  stashdbSceneId: string;
  searchOnAdd?: boolean;
};

export type AddSceneResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.addScene;
  whisparrId?: number;
  error?: string;
};

export type SetMonitorStateRequest = {
  type: typeof MESSAGE_TYPES.setMonitorState;
  whisparrId: number;
  monitored: boolean;
};

export type SetMonitorStateResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.setMonitorState;
  monitored: boolean;
  error?: string;
};

export type UpdateTagsRequest = {
  type: typeof MESSAGE_TYPES.updateTags;
  whisparrId: number;
  tagIds: number[];
};

export type UpdateTagsResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.updateTags;
  tagIds?: number[];
  error?: string;
};

export type UpdateQualityProfileRequest = {
  type: typeof MESSAGE_TYPES.updateQualityProfile;
  whisparrId: number;
  qualityProfileId: number;
};

export type UpdateQualityProfileResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.updateQualityProfile;
  qualityProfileId?: number;
  error?: string;
};

export type SceneCardActionRequestedRequest = {
  type: typeof MESSAGE_TYPES.sceneCardActionRequested;
  sceneId: string;
  sceneUrl: string;
  action: 'stub_add';
};

export type SceneCardActionRequestedResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.sceneCardActionRequested;
  error?: string;
};

export type SceneCardsCheckStatusRequest = {
  type: typeof MESSAGE_TYPES.sceneCardsCheckStatus;
  items: Array<{ sceneId: string; sceneUrl: string }>;
};

export type SceneCardsCheckStatusResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.sceneCardsCheckStatus;
  results?: Array<{
    sceneId: string;
    exists: boolean;
    whisparrId?: number;
    monitored?: boolean;
    tagIds?: number[];
    hasFile?: boolean;
    excluded?: boolean;
  }>;
  error?: string;
};

export type SceneCardAddRequest = {
  type: typeof MESSAGE_TYPES.sceneCardAdd;
  sceneId: string;
  sceneUrl: string;
  searchOnAdd?: boolean;
};

export type SceneCardAddResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.sceneCardAdd;
  whisparrId?: number;
  error?: string;
};

export type SceneCardTriggerSearchRequest = {
  type: typeof MESSAGE_TYPES.sceneCardTriggerSearch;
  whisparrId: number;
};

export type SceneCardTriggerSearchResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.sceneCardTriggerSearch;
  error?: { code: string; message: string };
};

export type SceneCardSetExcludedRequest = {
  type: typeof MESSAGE_TYPES.sceneCardSetExcluded;
  sceneId: string;
  excluded: boolean;
  movieTitle?: string;
  movieYear?: number;
};

export type SceneCardSetExcludedResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.sceneCardSetExcluded;
  excluded?: boolean;
  error?: { code: string; message: string };
};

export type StashFindSceneByStashdbIdRequest = {
  type: typeof MESSAGE_TYPES.stashFindSceneByStashdbId;
  stashdbSceneId: string;
};

export type StashFindSceneByStashdbIdResponse = {
  ok: boolean;
  type: typeof MESSAGE_TYPES.stashFindSceneByStashdbId;
  found: boolean;
  stashSceneId?: string | number;
  stashScenePath?: string;
  title?: string;
  stashSceneUrl?: string;
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
  openExternalLinksInNewTab?: boolean;
  searchOnAdd?: boolean;
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
  | CheckSceneStatusRequest
  | AddSceneRequest
  | SetMonitorStateRequest
  | UpdateTagsRequest
  | UpdateQualityProfileRequest
  | SceneCardActionRequestedRequest
  | SceneCardsCheckStatusRequest
  | SceneCardAddRequest
  | SceneCardTriggerSearchRequest
  | SceneCardSetExcludedRequest
  | StashFindSceneByStashdbIdRequest;

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
  | AddSceneResponse
  | SetMonitorStateResponse
  | UpdateTagsResponse
  | UpdateQualityProfileResponse
  | SceneCardActionRequestedResponse
  | SceneCardsCheckStatusResponse
  | SceneCardAddResponse
  | SceneCardTriggerSearchResponse
  | SceneCardSetExcludedResponse
  | StashFindSceneByStashdbIdResponse
  | { ok: false; type: MessageType; error: string };

export type MessageMap = {
  [MESSAGE_TYPES.ping]: {
    request: PingRequest;
    response: PingResponse;
  };
  [MESSAGE_TYPES.getSettings]: {
    request: GetSettingsRequest;
    response: {
      ok: true;
      type: typeof MESSAGE_TYPES.getSettings;
      settings: ExtensionSettings;
    };
  };
  [MESSAGE_TYPES.getConfigStatus]: {
    request: GetConfigStatusRequest;
    response: {
      ok: true;
      type: typeof MESSAGE_TYPES.getConfigStatus;
      configured: boolean;
    };
  };
  [MESSAGE_TYPES.openOptionsPage]: {
    request: OpenOptionsPageRequest;
    response: OpenOptionsPageResponse;
  };
};
