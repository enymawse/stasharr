import { createBatcher } from '../shared/batch.js';
import { createTtlCache } from '../shared/cache.js';
import { sendMessage } from '../shared/messaging.js';
import {
  createDebouncedMutationObserver,
  createLocationObserver,
} from './dom/observer.js';
import { extractSceneIdFromPathname, parseStashDbPage } from './parsing.js';
import { createIconButton, setButtonState } from './ui/buttons.js';
import { copyTextToClipboard } from './ui/clipboard.js';
import { renderIcon } from './ui/icons.js';
import { createStatusIndicator } from './ui/statusIndicator.js';
import type {
  ExtensionRequest,
  ExtensionResponse,
} from '../shared/messages.js';

const MESSAGE_TYPES_CONTENT = {
  getConfigStatus: 'GET_CONFIG_STATUS',
} as const;

type GetConfigStatusRequest = {
  type: typeof MESSAGE_TYPES_CONTENT.getConfigStatus;
};
type GetSettingsRequest = { type: 'GET_SETTINGS' };
type OpenOptionsPageRequest = { type: 'OPEN_OPTIONS_PAGE' };
type CheckSceneStatusRequest = {
  type: 'CHECK_SCENE_STATUS';
  stashdbSceneId: string;
};
type AddSceneRequest = {
  type: 'ADD_SCENE';
  stashdbSceneId: string;
  searchOnAdd?: boolean;
};
type SetMonitorStateRequest = {
  type: 'SET_MONITOR_STATE';
  whisparrId: number;
  monitored: boolean;
};
type FetchDiscoveryCatalogsRequest = {
  type: 'FETCH_DISCOVERY_CATALOGS';
  kind: 'whisparr';
  force?: boolean;
};
type UpdateTagsRequest = {
  type: 'UPDATE_TAGS';
  whisparrId: number;
  tagIds: number[];
};
type UpdateQualityProfileRequest = {
  type: 'UPDATE_QUALITY_PROFILE';
  whisparrId: number;
  qualityProfileId: number;
};
type SceneCardsCheckStatusRequest = {
  type: 'SCENE_CARDS_CHECK_STATUS';
  items: Array<{ sceneId: string; sceneUrl: string }>;
};
type SceneCardAddRequest = {
  type: 'SCENE_CARD_ADD';
  sceneId: string;
  sceneUrl: string;
  searchOnAdd?: boolean;
};
type SceneCardTriggerSearchRequest = {
  type: 'SCENE_CARD_TRIGGER_SEARCH';
  whisparrId: number;
};
type SceneCardSetExcludedRequest = {
  type: 'SCENE_CARD_SET_EXCLUDED';
  sceneId: string;
  excluded: boolean;
  movieTitle?: string;
  movieYear?: number;
};
type PerformerCheckStatusRequest = {
  type: 'PERFORMER_CHECK_STATUS';
  stashdbPerformerId: string;
};
type PerformerAddRequest = {
  type: 'PERFORMER_ADD';
  stashdbPerformerId: string;
  name?: string;
};
type PerformerSetMonitorRequest = {
  type: 'PERFORMER_SET_MONITOR';
  stashdbPerformerId: string;
  monitored: boolean;
};
type PerformerUpdateTagsRequest = {
  type: 'PERFORMER_UPDATE_TAGS';
  stashdbPerformerId: string;
  tagIds: number[];
};
type PerformerUpdateQualityProfileRequest = {
  type: 'PERFORMER_UPDATE_QUALITY_PROFILE';
  stashdbPerformerId: string;
  qualityProfileId: number;
};
type StudioCheckStatusRequest = {
  type: 'STUDIO_CHECK_STATUS';
  stashdbStudioId: string;
};
type StudioAddRequest = {
  type: 'STUDIO_ADD';
  stashdbStudioId: string;
  name?: string;
};
type StudioSetMonitorRequest = {
  type: 'STUDIO_SET_MONITOR';
  stashdbStudioId: string;
  monitored: boolean;
};
type StudioUpdateTagsRequest = {
  type: 'STUDIO_UPDATE_TAGS';
  stashdbStudioId: string;
  tagIds: number[];
};
type StudioUpdateQualityProfileRequest = {
  type: 'STUDIO_UPDATE_QUALITY_PROFILE';
  stashdbStudioId: string;
  qualityProfileId: number;
};
type StashFindSceneByStashdbIdRequest = {
  type: 'STASH_FIND_SCENE_BY_STASHDB_ID';
  stashdbSceneId: string;
};

type ContentRuntime = {
  runtime: {
    sendMessage: (
      message:
        | GetConfigStatusRequest
        | GetSettingsRequest
        | OpenOptionsPageRequest
        | CheckSceneStatusRequest
        | AddSceneRequest
        | SetMonitorStateRequest
        | FetchDiscoveryCatalogsRequest
        | UpdateTagsRequest
        | UpdateQualityProfileRequest
        | SceneCardsCheckStatusRequest
        | SceneCardAddRequest
        | SceneCardTriggerSearchRequest
        | SceneCardSetExcludedRequest
        | PerformerCheckStatusRequest
        | PerformerAddRequest
        | PerformerSetMonitorRequest
        | PerformerUpdateTagsRequest
        | PerformerUpdateQualityProfileRequest
        | StudioCheckStatusRequest
        | StudioAddRequest
        | StudioSetMonitorRequest
        | StudioUpdateTagsRequest
        | StudioUpdateQualityProfileRequest
        | StashFindSceneByStashdbIdRequest,
    ) => Promise<{
      ok: boolean;
      configured?: boolean;
      settings?: {
        whisparrBaseUrl?: string;
        whisparrApiKey?: string;
        stashBaseUrl?: string;
        stashApiKey?: string;
        lastValidatedAt?: string;
        searchOnAdd?: boolean;
      };
      catalogs?: {
        qualityProfiles?: Array<{ id: number; name: string }>;
        tags?: Array<{ id: number; label: string }>;
      };
      tagIds?: number[];
      qualityProfileId?: number;
      exists?: boolean;
      whisparrId?: number;
      title?: string;
      hasFile?: boolean;
      monitored?: boolean;
      name?: string;
      error?: string;
      results?: Array<{
        sceneId: string;
        exists: boolean;
        whisparrId?: number;
        monitored?: boolean;
        tagIds?: number[];
        hasFile?: boolean;
        excluded?: boolean;
      }>;
      excluded?: boolean;
      found?: boolean;
      stashSceneId?: string | number;
      stashScenePath?: string;
      stashSceneUrl?: string;
    }>;
    getURL?: (path: string) => string;
    openOptionsPage?: () => void;
  };
};

const PANEL_ID = 'stasharr-extension-panel';
const extContent =
  (
    globalThis as typeof globalThis & {
      browser?: ContentRuntime;
      chrome?: ContentRuntime;
    }
  ).browser ??
  (globalThis as typeof globalThis & { chrome?: ContentRuntime }).chrome;

if (!extContent) {
  throw new Error('Extension runtime not available.');
}

type NavigationBridge = {
  openExternalLink: (
    url: string,
    options?: { forceNewTab?: boolean },
  ) => Promise<void>;
};

const navigationBridge = (
  globalThis as { StasharrNavigation?: NavigationBridge }
).StasharrNavigation;

async function openExternalLink(
  url: string,
  options?: { forceNewTab?: boolean },
) {
  if (!navigationBridge?.openExternalLink) {
    return;
  }
  await navigationBridge.openExternalLink(url, options);
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

function buildWhisparrSceneUrl(baseUrl: string, stashId: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/movie/${encodeURIComponent(stashId)}`;
}

function buildWhisparrPerformerUrl(baseUrl: string, stashId: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/performer/${encodeURIComponent(stashId)}`;
}

function buildWhisparrStudioUrl(baseUrl: string, stashId: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/studio/${encodeURIComponent(stashId)}`;
}

function applyDisabledStyles(button: HTMLButtonElement, disabled: boolean) {
  button.disabled = disabled;
  if (disabled) {
    button.style.opacity = '0.55';
    button.style.cursor = 'not-allowed';
  } else {
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }
}

function getParsedPage() {
  return parseStashDbPage(document, window.location);
}

const isEditPage = window.location.pathname.startsWith('/edit/');

if (!isEditPage && !document.getElementById(PANEL_ID)) {
  const statusCache = new Map<
    string,
    {
      exists: boolean;
      whisparrId?: number;
      title?: string;
      hasFile?: boolean;
      monitored?: boolean;
      tagIds?: number[];
      qualityProfileId?: number;
      excluded?: boolean;
      error?: string;
    }
  >();
  const inFlight = new Set<string>();
  const stashLookupInFlight = new Set<string>();
  const tagUpdateInFlight = new Set<string>();
  const qualityProfileUpdateInFlight = new Set<string>();
  const performerTagUpdateInFlight = new Set<string>();
  const performerQualityUpdateInFlight = new Set<string>();
  const studioTagUpdateInFlight = new Set<string>();
  const studioQualityUpdateInFlight = new Set<string>();
  let tagCatalog: Array<{ id: number; label: string }> = [];
  let qualityProfileCatalog: Array<{ id: number; name: string }> = [];
  let whisparrBaseUrl: string | null = null;
  let stashConfigured = false;
  let searchOnAdd = true;
  let sceneCopyResetTimer: number | null = null;
  const stashMatchCache = new Map<
    string,
    {
      found: boolean;
      stashSceneId?: string | number;
      stashScenePath?: string;
      stashSceneUrl?: string;
      title?: string;
      error?: string;
    }
  >();

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
  let parsedPage = getParsedPage();
  diagnostics.textContent = `Diagnostics: ${parsedPage.type} • ${truncate(parsedPage.url, 140)}`;
  diagnostics.style.opacity = '0.85';
  panel.appendChild(diagnostics);

  const parseDetails = document.createElement('div');
  parseDetails.style.marginTop = '6px';
  parseDetails.style.fontSize = '11px';
  parseDetails.style.opacity = '0.9';
  const updateDiagnostics = () => {
    parsedPage = getParsedPage();
    const idsText =
      parsedPage.stashIds.length > 0 ? parsedPage.stashIds.join(', ') : 'none';
    const canonicalText = parsedPage.canonicalUrl ?? 'none';
    diagnostics.textContent = `Diagnostics: ${parsedPage.type} • ${truncate(parsedPage.url, 140)}`;
    parseDetails.textContent = `Detected: ${parsedPage.type} | IDs: ${idsText} | Canonical: ${canonicalText}`;
  };
  updateDiagnostics();
  panel.appendChild(parseDetails);

  const sceneControls = document.createElement('div');
  sceneControls.style.display = 'none';
  panel.appendChild(sceneControls);

  const sceneStatusRow = document.createElement('div');
  sceneStatusRow.style.marginTop = '6px';
  sceneStatusRow.style.fontSize = '11px';
  sceneStatusRow.style.opacity = '0.9';
  sceneStatusRow.textContent = 'Scene status: unknown';
  sceneControls.appendChild(sceneStatusRow);

  const sceneIdRow = document.createElement('div');
  sceneIdRow.style.display = 'flex';
  sceneIdRow.style.alignItems = 'center';
  sceneIdRow.style.gap = '6px';
  sceneIdRow.style.marginTop = '6px';
  sceneControls.appendChild(sceneIdRow);

  const sceneCopyButton = document.createElement('button');
  sceneCopyButton.type = 'button';
  sceneCopyButton.textContent = 'Copy ID';
  sceneCopyButton.style.padding = '4px 8px';
  sceneCopyButton.style.borderRadius = '6px';
  sceneCopyButton.style.border = '1px solid #1f2937';
  sceneCopyButton.style.cursor = 'pointer';
  sceneCopyButton.style.background = '#e2e8f0';
  sceneCopyButton.style.color = '#0f172a';
  applyDisabledStyles(sceneCopyButton, true);
  sceneIdRow.appendChild(sceneCopyButton);

  const sceneCopyStatus = document.createElement('div');
  sceneCopyStatus.style.fontSize = '11px';
  sceneCopyStatus.style.opacity = '0.8';
  sceneCopyStatus.textContent = 'Scene ID: unavailable';
  sceneIdRow.appendChild(sceneCopyStatus);

  const actionRow = document.createElement('div');
  actionRow.style.display = 'flex';
  actionRow.style.gap = '6px';
  actionRow.style.marginTop = '6px';
  sceneControls.appendChild(actionRow);

  const checkStatusButton = document.createElement('button');
  checkStatusButton.type = 'button';
  checkStatusButton.textContent = 'Check status';
  checkStatusButton.style.padding = '6px 10px';
  checkStatusButton.style.borderRadius = '6px';
  checkStatusButton.style.border = 'none';
  checkStatusButton.style.cursor = 'pointer';
  checkStatusButton.style.background = '#00853d';
  checkStatusButton.style.color = '#ffffff';
  checkStatusButton.style.flex = '1';
  actionRow.appendChild(checkStatusButton);

  const addSceneButton = document.createElement('button');
  addSceneButton.type = 'button';
  addSceneButton.textContent = 'Add to Whisparr';
  addSceneButton.style.padding = '6px 10px';
  addSceneButton.style.borderRadius = '6px';
  addSceneButton.style.border = 'none';
  addSceneButton.style.cursor = 'pointer';
  addSceneButton.style.background = '#c084fc';
  addSceneButton.style.color = '#ffffff';
  addSceneButton.style.flex = '1';
  applyDisabledStyles(addSceneButton, true);
  actionRow.appendChild(addSceneButton);

  const viewRow = document.createElement('div');
  viewRow.style.display = 'none';
  viewRow.style.gap = '6px';
  viewRow.style.marginTop = '6px';
  sceneControls.appendChild(viewRow);

  const viewInStashButton = document.createElement('button');
  viewInStashButton.type = 'button';
  viewInStashButton.textContent = 'Stash';
  viewInStashButton.setAttribute('aria-label', 'View in Stash');
  viewInStashButton.title = 'View in Stash';
  viewInStashButton.style.padding = '6px 10px';
  viewInStashButton.style.borderRadius = '6px';
  viewInStashButton.style.border = 'none';
  viewInStashButton.style.cursor = 'pointer';
  viewInStashButton.style.background = '#137cbd';
  viewInStashButton.style.color = '#ffffff';
  viewInStashButton.style.display = 'inline-flex';
  viewInStashButton.style.alignItems = 'center';
  viewInStashButton.style.justifyContent = 'center';
  viewInStashButton.style.flex = '1';
  applyDisabledStyles(viewInStashButton, true);
  viewRow.appendChild(viewInStashButton);

  const viewInWhisparrButton = document.createElement('button');
  viewInWhisparrButton.type = 'button';
  viewInWhisparrButton.textContent = 'Whisparr';
  viewInWhisparrButton.setAttribute('aria-label', 'View in Whisparr');
  viewInWhisparrButton.title = 'View in Whisparr';
  viewInWhisparrButton.style.padding = '6px 10px';
  viewInWhisparrButton.style.borderRadius = '6px';
  viewInWhisparrButton.style.border = 'none';
  viewInWhisparrButton.style.cursor = 'pointer';
  viewInWhisparrButton.style.background = '#7138C8';
  viewInWhisparrButton.style.color = '#ffffff';
  viewInWhisparrButton.style.display = 'inline-flex';
  viewInWhisparrButton.style.alignItems = 'center';
  viewInWhisparrButton.style.justifyContent = 'center';
  viewInWhisparrButton.style.flex = '1';
  applyDisabledStyles(viewInWhisparrButton, true);
  viewInWhisparrButton.style.display = 'inline-flex';
  viewRow.appendChild(viewInWhisparrButton);

  const monitorRow = document.createElement('div');
  monitorRow.style.display = 'flex';
  monitorRow.style.gap = '6px';
  monitorRow.style.marginTop = '6px';
  sceneControls.appendChild(monitorRow);

  const monitorToggle = document.createElement('button');
  monitorToggle.type = 'button';
  monitorToggle.textContent = 'Monitor';
  monitorToggle.style.padding = '6px 10px';
  monitorToggle.style.borderRadius = '6px';
  monitorToggle.style.border = 'none';
  monitorToggle.style.cursor = 'pointer';
  monitorToggle.style.background = '#c4337c';
  monitorToggle.style.color = '#ffffff';
  monitorToggle.style.flex = '1';
  applyDisabledStyles(monitorToggle, true);
  monitorRow.appendChild(monitorToggle);

  const excludeToggle = document.createElement('button');
  excludeToggle.type = 'button';
  excludeToggle.textContent = 'Exclude';
  excludeToggle.style.padding = '6px 10px';
  excludeToggle.style.borderRadius = '6px';
  excludeToggle.style.border = 'none';
  excludeToggle.style.cursor = 'pointer';
  excludeToggle.style.background = '#c4273c';
  excludeToggle.style.color = '#ffffff';
  excludeToggle.style.flex = '1';
  applyDisabledStyles(excludeToggle, true);
  monitorRow.appendChild(excludeToggle);

  const qualityRow = document.createElement('div');
  qualityRow.style.marginTop = '8px';
  qualityRow.style.display = 'flex';
  qualityRow.style.flexDirection = 'column';
  qualityRow.style.gap = '6px';
  sceneControls.appendChild(qualityRow);

  const qualityLabel = document.createElement('div');
  qualityLabel.textContent = 'Quality profile';
  qualityLabel.style.fontSize = '11px';
  qualityLabel.style.opacity = '0.8';
  qualityRow.appendChild(qualityLabel);

  const qualitySelect = document.createElement('select');
  qualitySelect.style.padding = '6px';
  qualitySelect.style.borderRadius = '6px';
  qualitySelect.style.border = '1px solid #1f2937';
  qualitySelect.style.background = '#0b1220';
  qualitySelect.style.color = '#e2e8f0';
  qualitySelect.disabled = true;
  qualityRow.appendChild(qualitySelect);

  const qualityStatus = document.createElement('div');
  qualityStatus.style.fontSize = '11px';
  qualityStatus.style.opacity = '0.8';
  qualityStatus.textContent = 'Quality: unavailable';
  qualityRow.appendChild(qualityStatus);

  const updateQualityButton = document.createElement('button');
  updateQualityButton.type = 'button';
  updateQualityButton.textContent = 'Update quality';
  updateQualityButton.style.padding = '6px 10px';
  updateQualityButton.style.borderRadius = '6px';
  updateQualityButton.style.border = 'none';
  updateQualityButton.style.cursor = 'pointer';
  updateQualityButton.style.background = '#f59e0b';
  updateQualityButton.style.color = '#111827';
  applyDisabledStyles(updateQualityButton, true);
  qualityRow.appendChild(updateQualityButton);

  const tagsRow = document.createElement('div');
  tagsRow.style.marginTop = '8px';
  tagsRow.style.display = 'flex';
  tagsRow.style.flexDirection = 'column';
  tagsRow.style.gap = '6px';
  sceneControls.appendChild(tagsRow);

  const tagsLabel = document.createElement('div');
  tagsLabel.textContent = 'Tags';
  tagsLabel.style.fontSize = '11px';
  tagsLabel.style.opacity = '0.8';
  tagsRow.appendChild(tagsLabel);

  const tagsSelect = document.createElement('select');
  tagsSelect.multiple = true;
  tagsSelect.style.padding = '6px';
  tagsSelect.style.borderRadius = '6px';
  tagsSelect.style.border = '1px solid #1f2937';
  tagsSelect.style.background = '#0b1220';
  tagsSelect.style.color = '#e2e8f0';
  tagsSelect.style.minHeight = '90px';
  tagsSelect.disabled = true;
  tagsRow.appendChild(tagsSelect);

  const tagsStatus = document.createElement('div');
  tagsStatus.style.fontSize = '11px';
  tagsStatus.style.opacity = '0.8';
  tagsStatus.textContent = 'Tags: unavailable';
  tagsRow.appendChild(tagsStatus);

  const updateTagsButton = document.createElement('button');
  updateTagsButton.type = 'button';
  updateTagsButton.textContent = 'Update tags';
  updateTagsButton.style.padding = '6px 10px';
  updateTagsButton.style.borderRadius = '6px';
  updateTagsButton.style.border = 'none';
  updateTagsButton.style.cursor = 'pointer';
  updateTagsButton.style.background = '#0ea5e9';
  updateTagsButton.style.color = '#ffffff';
  applyDisabledStyles(updateTagsButton, true);
  tagsRow.appendChild(updateTagsButton);

  const performerControls = document.createElement('div');
  performerControls.style.display = 'none';
  panel.appendChild(performerControls);

  const performerStatusRow = document.createElement('div');
  performerStatusRow.style.marginTop = '6px';
  performerStatusRow.style.fontSize = '11px';
  performerStatusRow.style.opacity = '0.9';
  performerStatusRow.textContent = 'Performer status: unknown';
  performerControls.appendChild(performerStatusRow);

  const performerActionRow = document.createElement('div');
  performerActionRow.style.display = 'flex';
  performerActionRow.style.gap = '6px';
  performerActionRow.style.marginTop = '6px';
  performerControls.appendChild(performerActionRow);

  const performerCheckButton = document.createElement('button');
  performerCheckButton.type = 'button';
  performerCheckButton.textContent = 'Check status';
  performerCheckButton.style.padding = '6px 10px';
  performerCheckButton.style.borderRadius = '6px';
  performerCheckButton.style.border = 'none';
  performerCheckButton.style.cursor = 'pointer';
  performerCheckButton.style.background = '#00853d';
  performerCheckButton.style.color = '#ffffff';
  performerCheckButton.style.flex = '1';
  applyDisabledStyles(performerCheckButton, true);
  performerActionRow.appendChild(performerCheckButton);

  const performerAddButton = document.createElement('button');
  performerAddButton.type = 'button';
  performerAddButton.textContent = 'Add Performer';
  performerAddButton.style.padding = '6px 10px';
  performerAddButton.style.borderRadius = '6px';
  performerAddButton.style.border = 'none';
  performerAddButton.style.cursor = 'pointer';
  performerAddButton.style.background = '#c084fc';
  performerAddButton.style.color = '#ffffff';
  performerAddButton.style.flex = '1';
  applyDisabledStyles(performerAddButton, true);
  performerActionRow.appendChild(performerAddButton);

  const performerMonitorToggle = document.createElement('button');
  performerMonitorToggle.type = 'button';
  performerMonitorToggle.textContent = 'Monitor';
  performerMonitorToggle.style.padding = '6px 10px';
  performerMonitorToggle.style.borderRadius = '6px';
  performerMonitorToggle.style.border = 'none';
  performerMonitorToggle.style.cursor = 'pointer';
  performerMonitorToggle.style.background = '#c4337c';
  performerMonitorToggle.style.color = '#ffffff';
  performerMonitorToggle.style.flex = '1';
  applyDisabledStyles(performerMonitorToggle, true);
  performerActionRow.appendChild(performerMonitorToggle);

  const performerViewRow = document.createElement('div');
  performerViewRow.style.display = 'flex';
  performerViewRow.style.gap = '6px';
  performerViewRow.style.marginTop = '6px';
  performerControls.appendChild(performerViewRow);

  const performerViewButton = document.createElement('button');
  performerViewButton.type = 'button';
  performerViewButton.textContent = 'Whisparr';
  performerViewButton.setAttribute('aria-label', 'View performer in Whisparr');
  performerViewButton.title = 'View performer in Whisparr';
  performerViewButton.style.padding = '6px 10px';
  performerViewButton.style.borderRadius = '6px';
  performerViewButton.style.border = 'none';
  performerViewButton.style.cursor = 'pointer';
  performerViewButton.style.background = '#7138C8';
  performerViewButton.style.color = '#ffffff';
  performerViewButton.style.flex = '1';
  applyDisabledStyles(performerViewButton, true);
  performerViewRow.appendChild(performerViewButton);

  const performerQualityRow = document.createElement('div');
  performerQualityRow.style.marginTop = '8px';
  performerQualityRow.style.display = 'flex';
  performerQualityRow.style.flexDirection = 'column';
  performerQualityRow.style.gap = '6px';
  performerControls.appendChild(performerQualityRow);

  const performerQualityLabel = document.createElement('div');
  performerQualityLabel.textContent = 'Quality profile';
  performerQualityLabel.style.fontSize = '11px';
  performerQualityLabel.style.opacity = '0.8';
  performerQualityRow.appendChild(performerQualityLabel);

  const performerQualitySelect = document.createElement('select');
  performerQualitySelect.style.padding = '6px';
  performerQualitySelect.style.borderRadius = '6px';
  performerQualitySelect.style.border = '1px solid #1f2937';
  performerQualitySelect.style.background = '#0b1220';
  performerQualitySelect.style.color = '#e2e8f0';
  performerQualitySelect.disabled = true;
  performerQualityRow.appendChild(performerQualitySelect);

  const performerQualityStatus = document.createElement('div');
  performerQualityStatus.style.fontSize = '11px';
  performerQualityStatus.style.opacity = '0.8';
  performerQualityStatus.textContent = 'Quality: unavailable';
  performerQualityRow.appendChild(performerQualityStatus);

  const performerUpdateQualityButton = document.createElement('button');
  performerUpdateQualityButton.type = 'button';
  performerUpdateQualityButton.textContent = 'Update quality';
  performerUpdateQualityButton.style.padding = '6px 10px';
  performerUpdateQualityButton.style.borderRadius = '6px';
  performerUpdateQualityButton.style.border = 'none';
  performerUpdateQualityButton.style.cursor = 'pointer';
  performerUpdateQualityButton.style.background = '#f59e0b';
  performerUpdateQualityButton.style.color = '#111827';
  applyDisabledStyles(performerUpdateQualityButton, true);
  performerQualityRow.appendChild(performerUpdateQualityButton);

  const performerTagsRow = document.createElement('div');
  performerTagsRow.style.marginTop = '8px';
  performerTagsRow.style.display = 'flex';
  performerTagsRow.style.flexDirection = 'column';
  performerTagsRow.style.gap = '6px';
  performerControls.appendChild(performerTagsRow);

  const performerTagsLabel = document.createElement('div');
  performerTagsLabel.textContent = 'Tags';
  performerTagsLabel.style.fontSize = '11px';
  performerTagsLabel.style.opacity = '0.8';
  performerTagsRow.appendChild(performerTagsLabel);

  const performerTagsSelect = document.createElement('select');
  performerTagsSelect.multiple = true;
  performerTagsSelect.style.padding = '6px';
  performerTagsSelect.style.borderRadius = '6px';
  performerTagsSelect.style.border = '1px solid #1f2937';
  performerTagsSelect.style.background = '#0b1220';
  performerTagsSelect.style.color = '#e2e8f0';
  performerTagsSelect.style.minHeight = '90px';
  performerTagsSelect.disabled = true;
  performerTagsRow.appendChild(performerTagsSelect);

  const performerTagsStatus = document.createElement('div');
  performerTagsStatus.style.fontSize = '11px';
  performerTagsStatus.style.opacity = '0.8';
  performerTagsStatus.textContent = 'Tags: unavailable';
  performerTagsRow.appendChild(performerTagsStatus);

  const performerUpdateTagsButton = document.createElement('button');
  performerUpdateTagsButton.type = 'button';
  performerUpdateTagsButton.textContent = 'Update tags';
  performerUpdateTagsButton.style.padding = '6px 10px';
  performerUpdateTagsButton.style.borderRadius = '6px';
  performerUpdateTagsButton.style.border = 'none';
  performerUpdateTagsButton.style.cursor = 'pointer';
  performerUpdateTagsButton.style.background = '#22c55e';
  performerUpdateTagsButton.style.color = '#0b1220';
  applyDisabledStyles(performerUpdateTagsButton, true);
  performerTagsRow.appendChild(performerUpdateTagsButton);

  const studioControls = document.createElement('div');
  studioControls.style.display = 'none';
  panel.appendChild(studioControls);

  const studioStatusRow = document.createElement('div');
  studioStatusRow.style.marginTop = '6px';
  studioStatusRow.style.fontSize = '11px';
  studioStatusRow.style.opacity = '0.9';
  studioStatusRow.textContent = 'Studio status: unknown';
  studioControls.appendChild(studioStatusRow);

  const studioActionRow = document.createElement('div');
  studioActionRow.style.display = 'flex';
  studioActionRow.style.gap = '6px';
  studioActionRow.style.marginTop = '6px';
  studioControls.appendChild(studioActionRow);

  const studioCheckButton = document.createElement('button');
  studioCheckButton.type = 'button';
  studioCheckButton.textContent = 'Check status';
  studioCheckButton.style.padding = '6px 10px';
  studioCheckButton.style.borderRadius = '6px';
  studioCheckButton.style.border = 'none';
  studioCheckButton.style.cursor = 'pointer';
  studioCheckButton.style.background = '#00853d';
  studioCheckButton.style.color = '#ffffff';
  studioCheckButton.style.flex = '1';
  applyDisabledStyles(studioCheckButton, true);
  studioActionRow.appendChild(studioCheckButton);

  const studioAddButton = document.createElement('button');
  studioAddButton.type = 'button';
  studioAddButton.textContent = 'Add Studio';
  studioAddButton.style.padding = '6px 10px';
  studioAddButton.style.borderRadius = '6px';
  studioAddButton.style.border = 'none';
  studioAddButton.style.cursor = 'pointer';
  studioAddButton.style.background = '#c084fc';
  studioAddButton.style.color = '#ffffff';
  studioAddButton.style.flex = '1';
  applyDisabledStyles(studioAddButton, true);
  studioActionRow.appendChild(studioAddButton);

  const studioMonitorToggle = document.createElement('button');
  studioMonitorToggle.type = 'button';
  studioMonitorToggle.textContent = 'Monitor';
  studioMonitorToggle.style.padding = '6px 10px';
  studioMonitorToggle.style.borderRadius = '6px';
  studioMonitorToggle.style.border = 'none';
  studioMonitorToggle.style.cursor = 'pointer';
  studioMonitorToggle.style.background = '#c4337c';
  studioMonitorToggle.style.color = '#ffffff';
  studioMonitorToggle.style.flex = '1';
  applyDisabledStyles(studioMonitorToggle, true);
  studioActionRow.appendChild(studioMonitorToggle);

  const studioViewRow = document.createElement('div');
  studioViewRow.style.display = 'flex';
  studioViewRow.style.gap = '6px';
  studioViewRow.style.marginTop = '6px';
  studioControls.appendChild(studioViewRow);

  const studioViewButton = document.createElement('button');
  studioViewButton.type = 'button';
  studioViewButton.textContent = 'Whisparr';
  studioViewButton.setAttribute('aria-label', 'View studio in Whisparr');
  studioViewButton.title = 'View studio in Whisparr';
  studioViewButton.style.padding = '6px 10px';
  studioViewButton.style.borderRadius = '6px';
  studioViewButton.style.border = 'none';
  studioViewButton.style.cursor = 'pointer';
  studioViewButton.style.background = '#7138C8';
  studioViewButton.style.color = '#ffffff';
  studioViewButton.style.flex = '1';
  applyDisabledStyles(studioViewButton, true);
  studioViewRow.appendChild(studioViewButton);

  const studioQualityRow = document.createElement('div');
  studioQualityRow.style.marginTop = '8px';
  studioQualityRow.style.display = 'flex';
  studioQualityRow.style.flexDirection = 'column';
  studioQualityRow.style.gap = '6px';
  studioControls.appendChild(studioQualityRow);

  const studioQualityLabel = document.createElement('div');
  studioQualityLabel.textContent = 'Quality profile';
  studioQualityLabel.style.fontSize = '11px';
  studioQualityLabel.style.opacity = '0.8';
  studioQualityRow.appendChild(studioQualityLabel);

  const studioQualitySelect = document.createElement('select');
  studioQualitySelect.style.padding = '6px';
  studioQualitySelect.style.borderRadius = '6px';
  studioQualitySelect.style.border = '1px solid #1f2937';
  studioQualitySelect.style.background = '#0b1220';
  studioQualitySelect.style.color = '#e2e8f0';
  studioQualitySelect.disabled = true;
  studioQualityRow.appendChild(studioQualitySelect);

  const studioQualityStatus = document.createElement('div');
  studioQualityStatus.style.fontSize = '11px';
  studioQualityStatus.style.opacity = '0.8';
  studioQualityStatus.textContent = 'Quality: unavailable';
  studioQualityRow.appendChild(studioQualityStatus);

  const studioUpdateQualityButton = document.createElement('button');
  studioUpdateQualityButton.type = 'button';
  studioUpdateQualityButton.textContent = 'Update quality';
  studioUpdateQualityButton.style.padding = '6px 10px';
  studioUpdateQualityButton.style.borderRadius = '6px';
  studioUpdateQualityButton.style.border = 'none';
  studioUpdateQualityButton.style.cursor = 'pointer';
  studioUpdateQualityButton.style.background = '#f59e0b';
  studioUpdateQualityButton.style.color = '#111827';
  applyDisabledStyles(studioUpdateQualityButton, true);
  studioQualityRow.appendChild(studioUpdateQualityButton);

  const studioTagsRow = document.createElement('div');
  studioTagsRow.style.marginTop = '8px';
  studioTagsRow.style.display = 'flex';
  studioTagsRow.style.flexDirection = 'column';
  studioTagsRow.style.gap = '6px';
  studioControls.appendChild(studioTagsRow);

  const studioTagsLabel = document.createElement('div');
  studioTagsLabel.textContent = 'Tags';
  studioTagsLabel.style.fontSize = '11px';
  studioTagsLabel.style.opacity = '0.8';
  studioTagsRow.appendChild(studioTagsLabel);

  const studioTagsSelect = document.createElement('select');
  studioTagsSelect.multiple = true;
  studioTagsSelect.style.padding = '6px';
  studioTagsSelect.style.borderRadius = '6px';
  studioTagsSelect.style.border = '1px solid #1f2937';
  studioTagsSelect.style.background = '#0b1220';
  studioTagsSelect.style.color = '#e2e8f0';
  studioTagsSelect.style.minHeight = '90px';
  studioTagsSelect.disabled = true;
  studioTagsRow.appendChild(studioTagsSelect);

  const studioTagsStatus = document.createElement('div');
  studioTagsStatus.style.fontSize = '11px';
  studioTagsStatus.style.opacity = '0.8';
  studioTagsStatus.textContent = 'Tags: unavailable';
  studioTagsRow.appendChild(studioTagsStatus);

  const studioUpdateTagsButton = document.createElement('button');
  studioUpdateTagsButton.type = 'button';
  studioUpdateTagsButton.textContent = 'Update tags';
  studioUpdateTagsButton.style.padding = '6px 10px';
  studioUpdateTagsButton.style.borderRadius = '6px';
  studioUpdateTagsButton.style.border = 'none';
  studioUpdateTagsButton.style.cursor = 'pointer';
  studioUpdateTagsButton.style.background = '#22c55e';
  studioUpdateTagsButton.style.color = '#0b1220';
  applyDisabledStyles(studioUpdateTagsButton, true);
  studioTagsRow.appendChild(studioUpdateTagsButton);

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

    try {
      await sendMessage(
        extContent.runtime as {
          sendMessage: (
            message: ExtensionRequest,
          ) => Promise<ExtensionResponse>;
        },
        { type: 'OPEN_OPTIONS_PAGE' },
      );
    } catch (error) {
      console.warn('Open options failed:', error);
    }
  });

  inputRow.appendChild(statusRow);
  inputRow.appendChild(openOptions);
  panel.appendChild(inputRow);

  let readiness: 'unconfigured' | 'configured' | 'validated' = 'unconfigured';

  let currentMonitorState: boolean | null = null;
  let performerWhisparrId: number | null = null;
  let performerMonitored: boolean | null = null;
  let performerExists: boolean | null = null;
  let performerTagIds: number[] = [];
  let performerQualityProfileId: number | null = null;
  let studioWhisparrId: number | null = null;
  let studioMonitored: boolean | null = null;
  let studioExists: boolean | null = null;
  let studioTagIds: number[] = [];
  let studioQualityProfileId: number | null = null;

  const setSceneControlsVisible = (visible: boolean) => {
    sceneControls.style.display = visible ? 'block' : 'none';
  };

  const setPerformerControlsVisible = (visible: boolean) => {
    performerControls.style.display = visible ? 'block' : 'none';
  };

  const setStudioControlsVisible = (visible: boolean) => {
    studioControls.style.display = visible ? 'block' : 'none';
  };

  const getEntityTitle = () => {
    const headerTitle =
      document
        .querySelector<HTMLHeadingElement>('.studio-title h3 span')
        ?.textContent?.trim() ||
      document
        .querySelector<HTMLHeadingElement>('.studio-title h3')
        ?.textContent?.trim() ||
      document.querySelector<HTMLHeadingElement>('h1')?.textContent?.trim();
    return headerTitle || undefined;
  };

  const renderQualityOptions = (
    select: HTMLSelectElement,
    selectedId?: number,
  ) => {
    select.innerHTML = '';
    for (const profile of qualityProfileCatalog) {
      const option = document.createElement('option');
      option.value = String(profile.id);
      option.textContent = profile.name;
      option.selected = selectedId === profile.id;
      select.appendChild(option);
    }
  };

  const updateQualityControls = (sceneId?: string) => {
    const cached = sceneId ? statusCache.get(sceneId) : undefined;
    const exists = Boolean(cached?.exists);
    const selectedId = cached?.qualityProfileId;
    if (qualityProfileCatalog.length === 0) {
      qualityStatus.textContent = 'Quality: unavailable';
      applyDisabledStyles(updateQualityButton, true);
      qualitySelect.disabled = true;
      return;
    }
    renderQualityOptions(qualitySelect, selectedId);
    if (!exists) {
      qualityStatus.textContent = 'Quality: scene not in Whisparr';
      applyDisabledStyles(updateQualityButton, true);
      qualitySelect.disabled = true;
      return;
    }
    qualitySelect.disabled = false;
    applyDisabledStyles(updateQualityButton, false);
    qualityStatus.textContent = 'Quality: ready';
  };

  const renderTagOptions = (
    select: HTMLSelectElement,
    selectedIds: number[],
  ) => {
    select.innerHTML = '';
    for (const tag of tagCatalog) {
      const option = document.createElement('option');
      option.value = String(tag.id);
      option.textContent = tag.label;
      option.selected = selectedIds.includes(tag.id);
      select.appendChild(option);
    }
  };

  const updateTagControls = (sceneId?: string) => {
    const cached = sceneId ? statusCache.get(sceneId) : undefined;
    const exists = Boolean(cached?.exists);
    const selectedIds = cached?.tagIds ?? [];
    if (tagCatalog.length === 0) {
      tagsStatus.textContent = 'Tags: unavailable';
      applyDisabledStyles(updateTagsButton, true);
      tagsSelect.disabled = true;
      return;
    }
    renderTagOptions(tagsSelect, selectedIds);
    if (!exists) {
      tagsStatus.textContent = 'Tags: scene not in Whisparr';
      applyDisabledStyles(updateTagsButton, true);
      tagsSelect.disabled = true;
      return;
    }
    tagsSelect.disabled = false;
    applyDisabledStyles(updateTagsButton, false);
    tagsStatus.textContent = 'Tags: ready';
  };

  const canEditPerformer = () =>
    readiness === 'validated' && performerExists === true;

  const canEditStudio = () => readiness === 'validated' && studioExists === true;

  const updatePerformerQualityControls = () => {
    if (qualityProfileCatalog.length === 0) {
      performerQualityStatus.textContent = 'Quality: unavailable';
      applyDisabledStyles(performerUpdateQualityButton, true);
      performerQualitySelect.disabled = true;
      return;
    }
    renderQualityOptions(
      performerQualitySelect,
      performerQualityProfileId ?? undefined,
    );
    if (readiness !== 'validated') {
      performerQualityStatus.textContent = 'Quality: config not validated';
      applyDisabledStyles(performerUpdateQualityButton, true);
      performerQualitySelect.disabled = true;
      return;
    }
    if (!performerExists) {
      performerQualityStatus.textContent = 'Quality: performer not in Whisparr';
      applyDisabledStyles(performerUpdateQualityButton, true);
      performerQualitySelect.disabled = true;
      return;
    }
    performerQualitySelect.disabled = false;
    applyDisabledStyles(performerUpdateQualityButton, false);
    performerQualityStatus.textContent = 'Quality: ready';
  };

  const updatePerformerTagControls = () => {
    if (tagCatalog.length === 0) {
      performerTagsStatus.textContent = 'Tags: unavailable';
      applyDisabledStyles(performerUpdateTagsButton, true);
      performerTagsSelect.disabled = true;
      return;
    }
    renderTagOptions(performerTagsSelect, performerTagIds);
    if (readiness !== 'validated') {
      performerTagsStatus.textContent = 'Tags: config not validated';
      applyDisabledStyles(performerUpdateTagsButton, true);
      performerTagsSelect.disabled = true;
      return;
    }
    if (!performerExists) {
      performerTagsStatus.textContent = 'Tags: performer not in Whisparr';
      applyDisabledStyles(performerUpdateTagsButton, true);
      performerTagsSelect.disabled = true;
      return;
    }
    performerTagsSelect.disabled = false;
    applyDisabledStyles(performerUpdateTagsButton, false);
    performerTagsStatus.textContent = 'Tags: ready';
  };

  const updateStudioQualityControls = () => {
    if (qualityProfileCatalog.length === 0) {
      studioQualityStatus.textContent = 'Quality: unavailable';
      applyDisabledStyles(studioUpdateQualityButton, true);
      studioQualitySelect.disabled = true;
      return;
    }
    renderQualityOptions(
      studioQualitySelect,
      studioQualityProfileId ?? undefined,
    );
    if (readiness !== 'validated') {
      studioQualityStatus.textContent = 'Quality: config not validated';
      applyDisabledStyles(studioUpdateQualityButton, true);
      studioQualitySelect.disabled = true;
      return;
    }
    if (!studioExists) {
      studioQualityStatus.textContent = 'Quality: studio not in Whisparr';
      applyDisabledStyles(studioUpdateQualityButton, true);
      studioQualitySelect.disabled = true;
      return;
    }
    studioQualitySelect.disabled = false;
    applyDisabledStyles(studioUpdateQualityButton, false);
    studioQualityStatus.textContent = 'Quality: ready';
  };

  const updateStudioTagControls = () => {
    if (tagCatalog.length === 0) {
      studioTagsStatus.textContent = 'Tags: unavailable';
      applyDisabledStyles(studioUpdateTagsButton, true);
      studioTagsSelect.disabled = true;
      return;
    }
    renderTagOptions(studioTagsSelect, studioTagIds);
    if (readiness !== 'validated') {
      studioTagsStatus.textContent = 'Tags: config not validated';
      applyDisabledStyles(studioUpdateTagsButton, true);
      studioTagsSelect.disabled = true;
      return;
    }
    if (!studioExists) {
      studioTagsStatus.textContent = 'Tags: studio not in Whisparr';
      applyDisabledStyles(studioUpdateTagsButton, true);
      studioTagsSelect.disabled = true;
      return;
    }
    studioTagsSelect.disabled = false;
    applyDisabledStyles(studioUpdateTagsButton, false);
    studioTagsStatus.textContent = 'Tags: ready';
  };

  const updateExcludeControls = (sceneId?: string) => {
    const cached = sceneId ? statusCache.get(sceneId) : undefined;
    if (!sceneId) {
      excludeToggle.textContent = 'Exclude';
      applyDisabledStyles(excludeToggle, true);
      return;
    }
    if (cached?.exists) {
      excludeToggle.textContent = cached.excluded ? 'Excluded' : 'Exclude';
      applyDisabledStyles(excludeToggle, true);
      return;
    }
    excludeToggle.textContent = cached?.excluded ? 'Unexclude' : 'Exclude';
    applyDisabledStyles(excludeToggle, false);
  };

  const updateSceneCopyControls = (sceneId?: string) => {
    if (!sceneId) {
      sceneCopyStatus.textContent = 'Scene ID: unavailable';
      applyDisabledStyles(sceneCopyButton, true);
      return;
    }
    sceneCopyStatus.textContent = `Scene ID: ${sceneId}`;
    applyDisabledStyles(sceneCopyButton, false);
  };

  const updatePerformerStatus = async () => {
    const current = getParsedPage();
    const performerId =
      current.type === 'performer' ? current.stashIds[0] : undefined;
    if (!performerId) {
      performerStatusRow.textContent = 'Performer status: unavailable';
      applyDisabledStyles(performerAddButton, true);
      applyDisabledStyles(performerMonitorToggle, true);
      applyDisabledStyles(performerCheckButton, true);
      applyDisabledStyles(performerViewButton, true);
      performerWhisparrId = null;
      performerMonitored = null;
      performerExists = null;
      performerTagIds = [];
      performerQualityProfileId = null;
      updatePerformerQualityControls();
      updatePerformerTagControls();
      return;
    }
    if (readiness !== 'validated') {
      performerStatusRow.textContent = 'Performer status: config not validated';
      applyDisabledStyles(performerAddButton, true);
      applyDisabledStyles(performerMonitorToggle, true);
      applyDisabledStyles(performerCheckButton, true);
      applyDisabledStyles(performerViewButton, true);
      performerExists = null;
      performerTagIds = [];
      performerQualityProfileId = null;
      updatePerformerQualityControls();
      updatePerformerTagControls();
      return;
    }
    applyDisabledStyles(performerCheckButton, false);
    performerStatusRow.textContent = 'Performer status: checking...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'PERFORMER_CHECK_STATUS',
        stashdbPerformerId: performerId,
      });
      if (!response.ok) {
        performerStatusRow.textContent = `Performer status: error (${response.error ?? 'unknown'})`;
        applyDisabledStyles(performerAddButton, true);
        applyDisabledStyles(performerMonitorToggle, true);
        applyDisabledStyles(performerViewButton, true);
        performerExists = null;
        performerTagIds = [];
        performerQualityProfileId = null;
        updatePerformerQualityControls();
        updatePerformerTagControls();
        return;
      }
      performerWhisparrId = response.whisparrId ?? null;
      performerMonitored =
        typeof response.monitored === 'boolean' ? response.monitored : null;
      performerExists = response.exists ?? null;
      performerTagIds = response.tagIds ?? [];
      performerQualityProfileId =
        typeof response.qualityProfileId === 'number'
          ? response.qualityProfileId
          : null;
      if (response.exists) {
        performerStatusRow.textContent = performerMonitored
          ? 'Performer status: monitored'
          : 'Performer status: unmonitored';
        applyDisabledStyles(performerAddButton, true);
        applyDisabledStyles(performerMonitorToggle, false);
        performerMonitorToggle.textContent = performerMonitored
          ? 'Unmonitor'
          : 'Monitor';
        applyDisabledStyles(
          performerViewButton,
          !(whisparrBaseUrl && performerId),
        );
      } else {
        performerStatusRow.textContent = 'Performer status: not in Whisparr';
        applyDisabledStyles(performerAddButton, false);
        applyDisabledStyles(performerMonitorToggle, true);
        applyDisabledStyles(performerViewButton, true);
      }
      updatePerformerQualityControls();
      updatePerformerTagControls();
    } catch (error) {
      performerStatusRow.textContent = `Performer status: error (${(error as Error).message})`;
      applyDisabledStyles(performerAddButton, true);
      applyDisabledStyles(performerMonitorToggle, true);
      applyDisabledStyles(performerViewButton, true);
      performerExists = null;
      performerTagIds = [];
      performerQualityProfileId = null;
      updatePerformerQualityControls();
      updatePerformerTagControls();
    }
  };

  const updateStudioStatus = async () => {
    const current = getParsedPage();
    const studioId =
      current.type === 'studio' ? current.stashIds[0] : undefined;
    if (!studioId) {
      studioStatusRow.textContent = 'Studio status: unavailable';
      applyDisabledStyles(studioAddButton, true);
      applyDisabledStyles(studioMonitorToggle, true);
      applyDisabledStyles(studioCheckButton, true);
      applyDisabledStyles(studioViewButton, true);
      studioWhisparrId = null;
      studioMonitored = null;
      studioExists = null;
      studioTagIds = [];
      studioQualityProfileId = null;
      updateStudioQualityControls();
      updateStudioTagControls();
      return;
    }
    if (readiness !== 'validated') {
      studioStatusRow.textContent = 'Studio status: config not validated';
      applyDisabledStyles(studioAddButton, true);
      applyDisabledStyles(studioMonitorToggle, true);
      applyDisabledStyles(studioCheckButton, true);
      applyDisabledStyles(studioViewButton, true);
      studioExists = null;
      studioTagIds = [];
      studioQualityProfileId = null;
      updateStudioQualityControls();
      updateStudioTagControls();
      return;
    }
    applyDisabledStyles(studioCheckButton, false);
    studioStatusRow.textContent = 'Studio status: checking...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'STUDIO_CHECK_STATUS',
        stashdbStudioId: studioId,
      });
      if (!response.ok) {
        studioStatusRow.textContent = `Studio status: error (${response.error ?? 'unknown'})`;
        applyDisabledStyles(studioAddButton, true);
        applyDisabledStyles(studioMonitorToggle, true);
        applyDisabledStyles(studioViewButton, true);
        studioExists = null;
        studioTagIds = [];
        studioQualityProfileId = null;
        updateStudioQualityControls();
        updateStudioTagControls();
        return;
      }
      studioWhisparrId = response.whisparrId ?? null;
      studioMonitored =
        typeof response.monitored === 'boolean' ? response.monitored : null;
      studioExists = response.exists ?? null;
      studioTagIds = response.tagIds ?? [];
      studioQualityProfileId =
        typeof response.qualityProfileId === 'number'
          ? response.qualityProfileId
          : null;
      if (response.exists) {
        studioStatusRow.textContent = studioMonitored
          ? 'Studio status: monitored'
          : 'Studio status: unmonitored';
        applyDisabledStyles(studioAddButton, true);
        applyDisabledStyles(studioMonitorToggle, false);
        studioMonitorToggle.textContent = studioMonitored
          ? 'Unmonitor'
          : 'Monitor';
        applyDisabledStyles(
          studioViewButton,
          !(whisparrBaseUrl && studioId),
        );
      } else {
        studioStatusRow.textContent = 'Studio status: not in Whisparr';
        applyDisabledStyles(studioAddButton, false);
        applyDisabledStyles(studioMonitorToggle, true);
        applyDisabledStyles(studioViewButton, true);
      }
      updateStudioQualityControls();
      updateStudioTagControls();
    } catch (error) {
      studioStatusRow.textContent = `Studio status: error (${(error as Error).message})`;
      applyDisabledStyles(studioAddButton, true);
      applyDisabledStyles(studioMonitorToggle, true);
      applyDisabledStyles(studioViewButton, true);
      studioExists = null;
      studioTagIds = [];
      studioQualityProfileId = null;
      updateStudioQualityControls();
      updateStudioTagControls();
    }
  };

  const loadCatalogs = async () => {
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'FETCH_DISCOVERY_CATALOGS',
        kind: 'whisparr',
      });
      if (response.ok && response.catalogs) {
        if (response.catalogs.tags) {
          tagCatalog = response.catalogs.tags;
        }
        if (response.catalogs.qualityProfiles) {
          qualityProfileCatalog = response.catalogs.qualityProfiles;
        }
        const sceneId = getParsedPage().stashIds[0];
        updateQualityControls(sceneId);
        updateTagControls(sceneId);
        updatePerformerQualityControls();
        updatePerformerTagControls();
        updateStudioQualityControls();
        updateStudioTagControls();
      }
    } catch {
      tagsStatus.textContent = 'Tags: unavailable';
      qualityStatus.textContent = 'Quality: unavailable';
    }
  };

  const applyActionState = (sceneId?: string) => {
    if (!sceneId) {
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, true);
      return;
    }
    const cached = statusCache.get(sceneId);
    if (cached?.exists) {
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, false);
      return;
    }
    applyDisabledStyles(addSceneButton, readiness !== 'validated');
    applyDisabledStyles(monitorToggle, true);
  };

  const updateViewInWhisparrButton = (sceneId?: string) => {
    if (!sceneId) {
      applyDisabledStyles(viewInWhisparrButton, true);
      viewInWhisparrButton.title = 'View in Whisparr';
      return;
    }

    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !whisparrBaseUrl) {
      applyDisabledStyles(viewInWhisparrButton, true);
      viewInWhisparrButton.title = whisparrBaseUrl
        ? 'No match in Whisparr'
        : 'Whisparr not configured';
      return;
    }

    applyDisabledStyles(viewInWhisparrButton, false);
    viewInWhisparrButton.title = 'View in Whisparr';
  };

  const updateViewInStashButton = async (sceneId?: string, force = false) => {
    if (!sceneId) {
      applyDisabledStyles(viewInStashButton, true);
      viewInStashButton.title = 'View in Stash';
      viewRow.style.display = 'none';
      updateViewInWhisparrButton(undefined);
      return;
    }

    if (!stashConfigured) {
      applyDisabledStyles(viewInStashButton, true);
      viewInStashButton.title = 'Stash not configured';
      viewRow.style.display = 'flex';
      updateViewInWhisparrButton(sceneId);
      return;
    }

    const cached = stashMatchCache.get(sceneId);
    if (cached && !force) {
      if (cached.found && cached.stashSceneUrl) {
        applyDisabledStyles(viewInStashButton, false);
        viewInStashButton.title = 'View in Stash';
        viewRow.style.display = 'flex';
        updateViewInWhisparrButton(sceneId);
      } else {
        applyDisabledStyles(viewInStashButton, true);
        viewInStashButton.title = cached.error
          ? 'Lookup failed'
          : 'No match in Stash';
        viewRow.style.display = 'flex';
        updateViewInWhisparrButton(sceneId);
      }
      return;
    }

    if (stashLookupInFlight.has(sceneId)) {
      return;
    }

    stashLookupInFlight.add(sceneId);
    applyDisabledStyles(viewInStashButton, true);
    viewInStashButton.title = 'Checking Stash...';
    viewRow.style.display = 'flex';
    updateViewInWhisparrButton(sceneId);

    try {
      const response = await extContent.runtime.sendMessage({
        type: 'STASH_FIND_SCENE_BY_STASHDB_ID',
        stashdbSceneId: sceneId,
      });
      if (!response.ok) {
        stashMatchCache.set(sceneId, {
          found: false,
          error: response.error ?? 'unknown',
        });
        applyDisabledStyles(viewInStashButton, true);
        viewInStashButton.title = 'Lookup failed';
        viewRow.style.display = 'flex';
        updateViewInWhisparrButton(sceneId);
        return;
      }

      const found = Boolean(response.found);
      stashMatchCache.set(sceneId, {
        found,
        stashSceneId: response.stashSceneId,
        stashScenePath: response.stashScenePath,
        stashSceneUrl: response.stashSceneUrl,
        title: response.title,
      });

      if (found && response.stashSceneUrl) {
        applyDisabledStyles(viewInStashButton, false);
        viewInStashButton.title = 'View in Stash';
        viewRow.style.display = 'flex';
        updateViewInWhisparrButton(sceneId);
      } else {
        applyDisabledStyles(viewInStashButton, true);
        viewInStashButton.title = 'No match in Stash';
        viewRow.style.display = 'flex';
        updateViewInWhisparrButton(sceneId);
      }
    } catch (error) {
      stashMatchCache.set(sceneId, {
        found: false,
        error: (error as Error).message,
      });
      applyDisabledStyles(viewInStashButton, true);
      viewInStashButton.title = 'Lookup failed';
      viewRow.style.display = 'flex';
      updateViewInWhisparrButton(sceneId);
    } finally {
      stashLookupInFlight.delete(sceneId);
    }
  };

  const updateSceneStatus = async (force = false) => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    setSceneControlsVisible(current.type === 'scene');
    if (!sceneId) {
      sceneStatusRow.textContent = 'Scene status: unavailable';
      checkStatusButton.disabled = true;
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, true);
      applyDisabledStyles(excludeToggle, true);
      excludeToggle.textContent = 'Exclude';
      qualitySelect.disabled = true;
      applyDisabledStyles(updateQualityButton, true);
      qualityStatus.textContent = 'Quality: unavailable';
      currentMonitorState = null;
      updateSceneCopyControls(undefined);
      await updateViewInStashButton(undefined, true);
      updateViewInWhisparrButton(undefined);
      return;
    }

    viewRow.style.display = 'flex';
    updateSceneCopyControls(sceneId);
    checkStatusButton.disabled = false;
    applyActionState(sceneId);
    void updateViewInStashButton(sceneId, force);
    updateViewInWhisparrButton(sceneId);

    if (!force) {
      const cached = statusCache.get(sceneId);
      if (cached) {
        sceneStatusRow.textContent = cached.excluded
          ? 'Scene status: excluded'
          : cached.exists
            ? `Scene status: already in Whisparr${cached.hasFile === false ? ' (no file)' : ''}`
            : 'Scene status: not in Whisparr';
        if (cached.exists) {
          applyDisabledStyles(addSceneButton, true);
          applyDisabledStyles(monitorToggle, false);
          if (typeof cached.monitored === 'boolean') {
            currentMonitorState = cached.monitored;
            monitorToggle.textContent = cached.monitored
              ? 'Unmonitor'
              : 'Monitor';
          }
          applyDisabledStyles(excludeToggle, true);
          excludeToggle.textContent = cached.excluded ? 'Excluded' : 'Exclude';
        } else {
          applyDisabledStyles(monitorToggle, true);
          applyDisabledStyles(excludeToggle, false);
          excludeToggle.textContent = cached.excluded ? 'Unexclude' : 'Exclude';
        }
        updateQualityControls(sceneId);
        updateTagControls(sceneId);
        updateExcludeControls(sceneId);
        updateViewInWhisparrButton(sceneId);
        return;
      }
    }

    if (inFlight.has(sceneId)) {
      return;
    }

    inFlight.add(sceneId);
    sceneStatusRow.textContent = 'Scene status: checking...';

    try {
      const response = await extContent.runtime.sendMessage({
        type: 'CHECK_SCENE_STATUS',
        stashdbSceneId: sceneId,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: error (${response.error ?? 'unknown'})`;
        statusCache.set(sceneId, {
          exists: false,
          error: response.error ?? 'unknown',
        });
        return;
      }

      const exists = Boolean(response.exists);
      statusCache.set(sceneId, {
        exists,
        whisparrId: response.whisparrId,
        title: response.title,
        hasFile: response.hasFile,
        monitored: response.monitored,
        tagIds: response.tagIds,
        qualityProfileId: response.qualityProfileId,
        excluded: response.excluded,
      });
      sceneStatusRow.textContent = response.excluded
        ? 'Scene status: excluded'
        : exists
          ? `Scene status: already in Whisparr${response.hasFile === false ? ' (no file)' : ''}`
          : 'Scene status: not in Whisparr';
      if (exists) {
        applyDisabledStyles(addSceneButton, true);
        applyDisabledStyles(monitorToggle, false);
        currentMonitorState =
          typeof response.monitored === 'boolean' ? response.monitored : null;
        if (currentMonitorState !== null) {
          monitorToggle.textContent = currentMonitorState
            ? 'Unmonitor'
            : 'Monitor';
        }
        applyDisabledStyles(excludeToggle, true);
        excludeToggle.textContent = response.excluded ? 'Excluded' : 'Exclude';
      } else {
        applyActionState(sceneId);
        currentMonitorState = null;
        applyDisabledStyles(excludeToggle, false);
        excludeToggle.textContent = response.excluded ? 'Unexclude' : 'Exclude';
      }
      updateQualityControls(sceneId);
      updateTagControls(sceneId);
      updateExcludeControls(sceneId);
      updateViewInWhisparrButton(sceneId);
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: error (${(error as Error).message})`;
    } finally {
      inFlight.delete(sceneId);
    }
  };

  const addScene = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      sceneStatusRow.textContent = 'Scene status: unavailable';
      return;
    }
    if (readiness !== 'validated') {
      sceneStatusRow.textContent = 'Scene status: config not validated';
      return;
    }
    applyDisabledStyles(addSceneButton, true);
    sceneStatusRow.textContent = 'Scene status: adding...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'ADD_SCENE',
        stashdbSceneId: sceneId,
        searchOnAdd,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: add failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(addSceneButton, false);
        return;
      }
      statusCache.set(sceneId, {
        exists: true,
        whisparrId: response.whisparrId,
      });
      currentMonitorState = true;
      monitorToggle.textContent = 'Unmonitor';
      sceneStatusRow.textContent = 'Scene status: already in Whisparr';
      applyDisabledStyles(addSceneButton, true);
      applyDisabledStyles(monitorToggle, false);
      updateQualityControls(sceneId);
      updateTagControls(sceneId);
      void updateSceneStatus(true);
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: add failed (${(error as Error).message})`;
      applyDisabledStyles(addSceneButton, false);
    }
  };

  const addPerformer = async () => {
    const current = getParsedPage();
    const performerId =
      current.type === 'performer' ? current.stashIds[0] : undefined;
    if (!performerId) {
      performerStatusRow.textContent = 'Performer status: unavailable';
      return;
    }
    if (readiness !== 'validated') {
      performerStatusRow.textContent = 'Performer status: config not validated';
      return;
    }
    applyDisabledStyles(performerAddButton, true);
    performerStatusRow.textContent = 'Performer status: adding...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'PERFORMER_ADD',
        stashdbPerformerId: performerId,
      });
      if (!response.ok) {
        performerStatusRow.textContent = `Performer status: add failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(performerAddButton, false);
        return;
      }
      performerWhisparrId = response.whisparrId ?? null;
      performerMonitored =
        typeof response.monitored === 'boolean' ? response.monitored : true;
      performerStatusRow.textContent = performerMonitored
        ? 'Performer status: monitored'
        : 'Performer status: unmonitored';
      performerMonitorToggle.textContent = performerMonitored
        ? 'Unmonitor'
        : 'Monitor';
      applyDisabledStyles(performerAddButton, true);
      applyDisabledStyles(performerMonitorToggle, false);
      if (whisparrBaseUrl) {
        applyDisabledStyles(performerViewButton, false);
      }
      void updatePerformerStatus();
    } catch (error) {
      performerStatusRow.textContent = `Performer status: add failed (${(error as Error).message})`;
      applyDisabledStyles(performerAddButton, false);
    }
  };

  const updatePerformerMonitorState = async () => {
    const current = getParsedPage();
    const performerId =
      current.type === 'performer' ? current.stashIds[0] : undefined;
    if (!performerId) {
      performerStatusRow.textContent = 'Performer status: unavailable';
      applyDisabledStyles(performerMonitorToggle, true);
      return;
    }
    if (performerMonitored === null) {
      performerStatusRow.textContent = 'Performer status: monitor unknown';
      return;
    }
    const nextState = !performerMonitored;
    applyDisabledStyles(performerMonitorToggle, true);
    performerStatusRow.textContent = nextState
      ? 'Performer status: enabling monitor...'
      : 'Performer status: disabling monitor...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'PERFORMER_SET_MONITOR',
        stashdbPerformerId: performerId,
        monitored: nextState,
      });
      if (!response.ok) {
        performerStatusRow.textContent = `Performer status: monitor update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(performerMonitorToggle, false);
        return;
      }
      const nextMonitored =
        typeof response.monitored === 'boolean'
          ? response.monitored
          : nextState;
      performerMonitored = nextMonitored;
      performerMonitorToggle.textContent = performerMonitored
        ? 'Unmonitor'
        : 'Monitor';
      performerStatusRow.textContent = performerMonitored
        ? 'Performer status: monitored'
        : 'Performer status: unmonitored';
      applyDisabledStyles(performerMonitorToggle, false);
      void updatePerformerStatus();
    } catch (error) {
      performerStatusRow.textContent = `Performer status: monitor update failed (${(error as Error).message})`;
      applyDisabledStyles(performerMonitorToggle, false);
    }
  };

  const updatePerformerQualityProfile = async () => {
    const current = getParsedPage();
    const performerId =
      current.type === 'performer' ? current.stashIds[0] : undefined;
    if (!performerId) {
      performerQualityStatus.textContent = 'Quality: performer unavailable';
      return;
    }
    if (!performerExists) {
      performerQualityStatus.textContent = 'Quality: performer not in Whisparr';
      return;
    }
    if (performerQualityUpdateInFlight.has(performerId)) {
      return;
    }
    const selectedId = Number(performerQualitySelect.value);
    if (!Number.isFinite(selectedId)) {
      performerQualityStatus.textContent = 'Quality: select a profile';
      return;
    }
    performerQualityUpdateInFlight.add(performerId);
    applyDisabledStyles(performerUpdateQualityButton, true);
    performerQualityStatus.textContent = 'Quality: updating...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'PERFORMER_UPDATE_QUALITY_PROFILE',
        stashdbPerformerId: performerId,
        qualityProfileId: selectedId,
      });
      if (!response.ok) {
        performerQualityStatus.textContent = `Quality: update failed (${response.error ?? 'unknown'})`;
        return;
      }
      performerQualityProfileId = response.qualityProfileId ?? selectedId;
      performerQualityStatus.textContent = 'Quality: updated';
    } catch (error) {
      performerQualityStatus.textContent = `Quality: update failed (${(error as Error).message})`;
    } finally {
      performerQualityUpdateInFlight.delete(performerId);
      applyDisabledStyles(performerUpdateQualityButton, !canEditPerformer());
    }
  };

  const updatePerformerTags = async () => {
    const current = getParsedPage();
    const performerId =
      current.type === 'performer' ? current.stashIds[0] : undefined;
    if (!performerId) {
      performerTagsStatus.textContent = 'Tags: performer unavailable';
      return;
    }
    if (!performerExists) {
      performerTagsStatus.textContent = 'Tags: performer not in Whisparr';
      return;
    }
    if (performerTagUpdateInFlight.has(performerId)) {
      return;
    }
    performerTagUpdateInFlight.add(performerId);
    applyDisabledStyles(performerUpdateTagsButton, true);
    performerTagsStatus.textContent = 'Tags: updating...';
    try {
      const selectedIds = Array.from(performerTagsSelect.selectedOptions)
        .map((option) => Number(option.value))
        .filter((value) => Number.isFinite(value));
      const response = await extContent.runtime.sendMessage({
        type: 'PERFORMER_UPDATE_TAGS',
        stashdbPerformerId: performerId,
        tagIds: selectedIds,
      });
      if (!response.ok) {
        performerTagsStatus.textContent = `Tags: update failed (${response.error ?? 'unknown'})`;
        return;
      }
      performerTagIds = response.tagIds ?? selectedIds;
      performerTagsStatus.textContent = 'Tags: updated';
    } catch (error) {
      performerTagsStatus.textContent = `Tags: update failed (${(error as Error).message})`;
    } finally {
      performerTagUpdateInFlight.delete(performerId);
      applyDisabledStyles(performerUpdateTagsButton, !canEditPerformer());
    }
  };

  const addStudio = async () => {
    const current = getParsedPage();
    const studioId =
      current.type === 'studio' ? current.stashIds[0] : undefined;
    if (!studioId) {
      studioStatusRow.textContent = 'Studio status: unavailable';
      return;
    }
    if (readiness !== 'validated') {
      studioStatusRow.textContent = 'Studio status: config not validated';
      return;
    }
    const name = getEntityTitle();
    if (!name) {
      studioStatusRow.textContent = 'Studio status: name unavailable';
      return;
    }
    applyDisabledStyles(studioAddButton, true);
    studioStatusRow.textContent = 'Studio status: adding...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'STUDIO_ADD',
        stashdbStudioId: studioId,
        name,
      });
      if (!response.ok) {
        studioStatusRow.textContent = `Studio status: add failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(studioAddButton, false);
        return;
      }
      studioWhisparrId = response.whisparrId ?? null;
      studioMonitored =
        typeof response.monitored === 'boolean' ? response.monitored : true;
      studioStatusRow.textContent = studioMonitored
        ? 'Studio status: monitored'
        : 'Studio status: unmonitored';
      studioMonitorToggle.textContent = studioMonitored
        ? 'Unmonitor'
        : 'Monitor';
      applyDisabledStyles(studioAddButton, true);
      applyDisabledStyles(studioMonitorToggle, false);
      if (whisparrBaseUrl) {
        applyDisabledStyles(studioViewButton, false);
      }
      void updateStudioStatus();
    } catch (error) {
      studioStatusRow.textContent = `Studio status: add failed (${(error as Error).message})`;
      applyDisabledStyles(studioAddButton, false);
    }
  };

  const updateStudioMonitorState = async () => {
    const current = getParsedPage();
    const studioId = current.type === 'studio' ? current.stashIds[0] : undefined;
    if (!studioId) {
      studioStatusRow.textContent = 'Studio status: unavailable';
      applyDisabledStyles(studioMonitorToggle, true);
      return;
    }
    if (studioMonitored === null) {
      studioStatusRow.textContent = 'Studio status: monitor unknown';
      return;
    }
    const nextState = !studioMonitored;
    applyDisabledStyles(studioMonitorToggle, true);
    studioStatusRow.textContent = nextState
      ? 'Studio status: enabling monitor...'
      : 'Studio status: disabling monitor...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'STUDIO_SET_MONITOR',
        stashdbStudioId: studioId,
        monitored: nextState,
      });
      if (!response.ok) {
        studioStatusRow.textContent = `Studio status: monitor update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(studioMonitorToggle, false);
        return;
      }
      const nextMonitored =
        typeof response.monitored === 'boolean'
          ? response.monitored
          : nextState;
      studioMonitored = nextMonitored;
      studioMonitorToggle.textContent = studioMonitored
        ? 'Unmonitor'
        : 'Monitor';
      studioStatusRow.textContent = studioMonitored
        ? 'Studio status: monitored'
        : 'Studio status: unmonitored';
      applyDisabledStyles(studioMonitorToggle, false);
      void updateStudioStatus();
    } catch (error) {
      studioStatusRow.textContent = `Studio status: monitor update failed (${(error as Error).message})`;
      applyDisabledStyles(studioMonitorToggle, false);
    }
  };

  const updateStudioQualityProfile = async () => {
    const current = getParsedPage();
    const studioId = current.type === 'studio' ? current.stashIds[0] : undefined;
    if (!studioId) {
      studioQualityStatus.textContent = 'Quality: studio unavailable';
      return;
    }
    if (!studioExists) {
      studioQualityStatus.textContent = 'Quality: studio not in Whisparr';
      return;
    }
    if (studioQualityUpdateInFlight.has(studioId)) {
      return;
    }
    const selectedId = Number(studioQualitySelect.value);
    if (!Number.isFinite(selectedId)) {
      studioQualityStatus.textContent = 'Quality: select a profile';
      return;
    }
    studioQualityUpdateInFlight.add(studioId);
    applyDisabledStyles(studioUpdateQualityButton, true);
    studioQualityStatus.textContent = 'Quality: updating...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'STUDIO_UPDATE_QUALITY_PROFILE',
        stashdbStudioId: studioId,
        qualityProfileId: selectedId,
      });
      if (!response.ok) {
        studioQualityStatus.textContent = `Quality: update failed (${response.error ?? 'unknown'})`;
        return;
      }
      studioQualityProfileId = response.qualityProfileId ?? selectedId;
      studioQualityStatus.textContent = 'Quality: updated';
    } catch (error) {
      studioQualityStatus.textContent = `Quality: update failed (${(error as Error).message})`;
    } finally {
      studioQualityUpdateInFlight.delete(studioId);
      applyDisabledStyles(studioUpdateQualityButton, !canEditStudio());
    }
  };

  const updateStudioTags = async () => {
    const current = getParsedPage();
    const studioId = current.type === 'studio' ? current.stashIds[0] : undefined;
    if (!studioId) {
      studioTagsStatus.textContent = 'Tags: studio unavailable';
      return;
    }
    if (!studioExists) {
      studioTagsStatus.textContent = 'Tags: studio not in Whisparr';
      return;
    }
    if (studioTagUpdateInFlight.has(studioId)) {
      return;
    }
    studioTagUpdateInFlight.add(studioId);
    applyDisabledStyles(studioUpdateTagsButton, true);
    studioTagsStatus.textContent = 'Tags: updating...';
    try {
      const selectedIds = Array.from(studioTagsSelect.selectedOptions)
        .map((option) => Number(option.value))
        .filter((value) => Number.isFinite(value));
      const response = await extContent.runtime.sendMessage({
        type: 'STUDIO_UPDATE_TAGS',
        stashdbStudioId: studioId,
        tagIds: selectedIds,
      });
      if (!response.ok) {
        studioTagsStatus.textContent = `Tags: update failed (${response.error ?? 'unknown'})`;
        return;
      }
      studioTagIds = response.tagIds ?? selectedIds;
      studioTagsStatus.textContent = 'Tags: updated';
    } catch (error) {
      studioTagsStatus.textContent = `Tags: update failed (${(error as Error).message})`;
    } finally {
      studioTagUpdateInFlight.delete(studioId);
      applyDisabledStyles(studioUpdateTagsButton, !canEditStudio());
    }
  };

  const updateMonitorState = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      return;
    }
    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !cached.whisparrId) {
      sceneStatusRow.textContent = 'Scene status: not in Whisparr';
      applyDisabledStyles(monitorToggle, true);
      return;
    }
    if (currentMonitorState === null) {
      sceneStatusRow.textContent = 'Scene status: monitor state unknown';
      return;
    }
    const nextState = !currentMonitorState;
    applyDisabledStyles(monitorToggle, true);
    sceneStatusRow.textContent = nextState
      ? 'Scene status: enabling monitor...'
      : 'Scene status: disabling monitor...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'SET_MONITOR_STATE',
        whisparrId: cached.whisparrId,
        monitored: nextState,
      });
      if (!response.ok) {
        sceneStatusRow.textContent = `Scene status: monitor update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(monitorToggle, false);
        return;
      }
      const monitored =
        typeof response.monitored === 'boolean'
          ? response.monitored
          : nextState;
      currentMonitorState = monitored;
      cached.monitored = monitored;
      monitorToggle.textContent = monitored ? 'Unmonitor' : 'Monitor';
      applyDisabledStyles(monitorToggle, false);
      sceneStatusRow.textContent = 'Scene status: already in Whisparr';
    } catch (error) {
      sceneStatusRow.textContent = `Scene status: monitor update failed (${(error as Error).message})`;
      applyDisabledStyles(monitorToggle, false);
    }
  };

  const updateExcludeState = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      return;
    }
    const cached = statusCache.get(sceneId);
    if (cached?.exists) {
      return;
    }
    const nextExcluded = !Boolean(cached?.excluded);
    applyDisabledStyles(excludeToggle, true);
    excludeToggle.textContent = 'Working...';
    const runtime = extContent?.runtime;
    if (!runtime) {
      excludeToggle.textContent = nextExcluded ? 'Exclude' : 'Unexclude';
      applyDisabledStyles(excludeToggle, false);
      return;
    }
    try {
      const headerTitle =
        document
          .querySelector<HTMLHeadingElement>('.card-header h3 span')
          ?.textContent?.trim() ??
        document
          .querySelector<HTMLHeadingElement>('.card-header h3')
          ?.textContent?.trim();
      const response = await runtime.sendMessage({
        type: 'SCENE_CARD_SET_EXCLUDED',
        sceneId,
        excluded: nextExcluded,
        movieTitle: headerTitle || cached?.title,
        movieYear: undefined,
      });
      if (!response.ok) {
        excludeToggle.textContent = cached?.excluded ? 'Unexclude' : 'Exclude';
        applyDisabledStyles(excludeToggle, false);
        return;
      }
      statusCache.set(sceneId, {
        ...cached,
        exists: cached?.exists ?? false,
        excluded: response.excluded ?? nextExcluded,
      });
      updateExcludeControls(sceneId);
    } catch {
      excludeToggle.textContent = cached?.excluded ? 'Unexclude' : 'Exclude';
      applyDisabledStyles(excludeToggle, false);
    }
  };

  const updateQualityProfile = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) return;
    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !cached.whisparrId) {
      qualityStatus.textContent = 'Quality: scene not in Whisparr';
      applyDisabledStyles(updateQualityButton, true);
      return;
    }
    if (qualityProfileUpdateInFlight.has(sceneId)) {
      return;
    }
    const selectedId = Number(qualitySelect.value);
    if (!Number.isFinite(selectedId) || selectedId <= 0) {
      qualityStatus.textContent = 'Quality: select a profile';
      applyDisabledStyles(updateQualityButton, true);
      return;
    }
    qualityProfileUpdateInFlight.add(sceneId);
    applyDisabledStyles(updateQualityButton, true);
    qualityStatus.textContent = 'Quality: updating...';
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'UPDATE_QUALITY_PROFILE',
        whisparrId: cached.whisparrId,
        qualityProfileId: selectedId,
      });
      if (!response.ok) {
        qualityStatus.textContent = `Quality: update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(updateQualityButton, false);
        return;
      }
      cached.qualityProfileId = response.qualityProfileId ?? selectedId;
      qualityStatus.textContent = 'Quality: updated';
      applyDisabledStyles(updateQualityButton, false);
    } catch (error) {
      qualityStatus.textContent = `Quality: update failed (${(error as Error).message})`;
      applyDisabledStyles(updateQualityButton, false);
    } finally {
      qualityProfileUpdateInFlight.delete(sceneId);
    }
  };

  const updateTags = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) return;
    const cached = statusCache.get(sceneId);
    if (!cached?.exists || !cached.whisparrId) {
      tagsStatus.textContent = 'Tags: scene not in Whisparr';
      applyDisabledStyles(updateTagsButton, true);
      return;
    }
    if (tagUpdateInFlight.has(sceneId)) {
      return;
    }
    tagUpdateInFlight.add(sceneId);
    applyDisabledStyles(updateTagsButton, true);
    tagsStatus.textContent = 'Tags: updating...';
    try {
      const selectedIds = Array.from(tagsSelect.selectedOptions)
        .map((opt) => Number(opt.value))
        .filter((val) => Number.isFinite(val));
      const response = await extContent.runtime.sendMessage({
        type: 'UPDATE_TAGS',
        whisparrId: cached.whisparrId,
        tagIds: selectedIds,
      });
      if (!response.ok) {
        tagsStatus.textContent = `Tags: update failed (${response.error ?? 'unknown'})`;
        applyDisabledStyles(updateTagsButton, false);
        return;
      }
      cached.tagIds = response.tagIds ?? selectedIds;
      tagsStatus.textContent = 'Tags: updated';
      applyDisabledStyles(updateTagsButton, false);
    } catch (error) {
      tagsStatus.textContent = `Tags: update failed (${(error as Error).message})`;
      applyDisabledStyles(updateTagsButton, false);
    } finally {
      tagUpdateInFlight.delete(sceneId);
    }
  };

  const copySceneId = async () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) {
      updateSceneCopyControls(undefined);
      return;
    }
    if (sceneCopyResetTimer !== null) {
      window.clearTimeout(sceneCopyResetTimer);
      sceneCopyResetTimer = null;
    }
    applyDisabledStyles(sceneCopyButton, true);
    sceneCopyButton.textContent = 'Copying...';
    const result = await copyTextToClipboard(sceneId);
    if (result.ok) {
      sceneCopyStatus.textContent = 'Scene ID copied';
      sceneCopyButton.textContent = 'Copied';
    } else {
      sceneCopyStatus.textContent = 'Copy failed';
      sceneCopyButton.textContent = 'Copy failed';
    }
    sceneCopyResetTimer = window.setTimeout(() => {
      sceneCopyButton.textContent = 'Copy ID';
      updateSceneCopyControls(sceneId);
    }, 1600);
  };

  checkStatusButton.addEventListener('click', () => {
    void updateSceneStatus(true);
  });

  sceneCopyButton.addEventListener('click', () => {
    void copySceneId();
  });

  addSceneButton.addEventListener('click', () => {
    void addScene();
  });

  performerAddButton.addEventListener('click', () => {
    void addPerformer();
  });

  performerCheckButton.addEventListener('click', () => {
    void updatePerformerStatus();
  });

  performerMonitorToggle.addEventListener('click', () => {
    void updatePerformerMonitorState();
  });

  performerViewButton.addEventListener('click', () => {
    const current = getParsedPage();
    const performerId =
      current.type === 'performer' ? current.stashIds[0] : undefined;
    if (!whisparrBaseUrl || !performerId) return;
    const url = buildWhisparrPerformerUrl(whisparrBaseUrl, performerId);
    void openExternalLink(url);
  });

  performerQualitySelect.addEventListener('change', () => {
    applyDisabledStyles(performerUpdateQualityButton, !canEditPerformer());
  });

  performerUpdateQualityButton.addEventListener('click', () => {
    void updatePerformerQualityProfile();
  });

  performerTagsSelect.addEventListener('change', () => {
    applyDisabledStyles(performerUpdateTagsButton, !canEditPerformer());
  });

  performerUpdateTagsButton.addEventListener('click', () => {
    void updatePerformerTags();
  });

  studioAddButton.addEventListener('click', () => {
    void addStudio();
  });

  studioCheckButton.addEventListener('click', () => {
    void updateStudioStatus();
  });

  studioMonitorToggle.addEventListener('click', () => {
    void updateStudioMonitorState();
  });

  studioViewButton.addEventListener('click', () => {
    const current = getParsedPage();
    const studioId = current.type === 'studio' ? current.stashIds[0] : undefined;
    if (!whisparrBaseUrl || !studioId) return;
    const url = buildWhisparrStudioUrl(whisparrBaseUrl, studioId);
    void openExternalLink(url);
  });

  studioQualitySelect.addEventListener('change', () => {
    applyDisabledStyles(studioUpdateQualityButton, !canEditStudio());
  });

  studioUpdateQualityButton.addEventListener('click', () => {
    void updateStudioQualityProfile();
  });

  studioTagsSelect.addEventListener('change', () => {
    applyDisabledStyles(studioUpdateTagsButton, !canEditStudio());
  });

  studioUpdateTagsButton.addEventListener('click', () => {
    void updateStudioTags();
  });

  viewInStashButton.addEventListener('click', () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId) return;
    const cached = stashMatchCache.get(sceneId);
    if (!cached?.stashSceneUrl) return;
    void openExternalLink(cached.stashSceneUrl);
  });

  viewInWhisparrButton.addEventListener('click', () => {
    const current = getParsedPage();
    const sceneId = current.type === 'scene' ? current.stashIds[0] : undefined;
    if (!sceneId || !whisparrBaseUrl) return;
    const cached = statusCache.get(sceneId);
    if (!cached?.exists) return;
    const url = buildWhisparrSceneUrl(whisparrBaseUrl, sceneId);
    void openExternalLink(url);
  });

  monitorToggle.addEventListener('click', () => {
    void updateMonitorState();
  });

  excludeToggle.addEventListener('click', () => {
    void updateExcludeState();
  });

  qualitySelect.addEventListener('change', () => {
    applyDisabledStyles(updateQualityButton, false);
  });

  updateQualityButton.addEventListener('click', () => {
    void updateQualityProfile();
  });

  tagsSelect.addEventListener('change', () => {
    applyDisabledStyles(updateTagsButton, false);
  });

  updateTagsButton.addEventListener('click', () => {
    void updateTags();
  });

  const updateEntityControls = () => {
    const current = getParsedPage();
    setSceneControlsVisible(current.type === 'scene');
    setPerformerControlsVisible(current.type === 'performer');
    setStudioControlsVisible(current.type === 'studio');
    if (current.type === 'performer') {
      void updatePerformerStatus();
    } else if (current.type === 'studio') {
      void updateStudioStatus();
    }
  };

  const resetPerformerPanelState = () => {
    performerStatusRow.textContent = 'Performer status: unknown';
    applyDisabledStyles(performerAddButton, true);
    applyDisabledStyles(performerMonitorToggle, true);
    applyDisabledStyles(performerCheckButton, true);
    applyDisabledStyles(performerViewButton, true);
    performerWhisparrId = null;
    performerMonitored = null;
    performerExists = null;
    performerTagIds = [];
    performerQualityProfileId = null;
    performerQualitySelect.disabled = true;
    performerTagsSelect.disabled = true;
    performerQualityStatus.textContent = 'Quality: unavailable';
    performerTagsStatus.textContent = 'Tags: unavailable';
    applyDisabledStyles(performerUpdateQualityButton, true);
    applyDisabledStyles(performerUpdateTagsButton, true);
  };

  const resetStudioPanelState = () => {
    studioStatusRow.textContent = 'Studio status: unknown';
    applyDisabledStyles(studioAddButton, true);
    applyDisabledStyles(studioMonitorToggle, true);
    applyDisabledStyles(studioCheckButton, true);
    applyDisabledStyles(studioViewButton, true);
    studioWhisparrId = null;
    studioMonitored = null;
    studioExists = null;
    studioTagIds = [];
    studioQualityProfileId = null;
    studioQualitySelect.disabled = true;
    studioTagsSelect.disabled = true;
    studioQualityStatus.textContent = 'Quality: unavailable';
    studioTagsStatus.textContent = 'Tags: unavailable';
    applyDisabledStyles(studioUpdateQualityButton, true);
    applyDisabledStyles(studioUpdateTagsButton, true);
  };

  const updateConfigStatus = async () => {
    try {
      const response = await extContent.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });
      if (!response.ok || !response.settings) {
        statusRow.textContent = 'Config: unavailable';
        readiness = 'unconfigured';
        applyDisabledStyles(addSceneButton, true);
        return;
      }
      const baseUrl = response.settings.whisparrBaseUrl?.trim() ?? '';
      const apiKey = response.settings.whisparrApiKey?.trim() ?? '';
      const configured = Boolean(baseUrl && apiKey);
      whisparrBaseUrl = baseUrl || null;
      stashConfigured = Boolean(
        response.settings.stashBaseUrl?.trim() &&
        response.settings.stashApiKey?.trim(),
      );
      searchOnAdd = response.settings.searchOnAdd ?? true;
      if (!configured) {
        statusRow.textContent = 'Config: not configured';
        readiness = 'unconfigured';
        applyDisabledStyles(addSceneButton, true);
        void updateViewInStashButton(getParsedPage().stashIds[0], true);
        updateViewInWhisparrButton(getParsedPage().stashIds[0]);
        updateEntityControls();
        return;
      }
      if (!response.settings.lastValidatedAt) {
        statusRow.textContent = 'Config: configured (not validated)';
        readiness = 'configured';
        applyDisabledStyles(addSceneButton, true);
        void updateViewInStashButton(getParsedPage().stashIds[0], true);
        updateViewInWhisparrButton(getParsedPage().stashIds[0]);
        updateEntityControls();
        return;
      }
      const validatedAt = new Date(response.settings.lastValidatedAt);
      statusRow.textContent = `Config: validated ${validatedAt.toLocaleString()}`;
      readiness = 'validated';
      applyActionState(getParsedPage().stashIds[0]);
      void updateViewInStashButton(getParsedPage().stashIds[0], true);
      updateViewInWhisparrButton(getParsedPage().stashIds[0]);
      updateEntityControls();
    } catch {
      statusRow.textContent = 'Config: unavailable';
      readiness = 'unconfigured';
      applyDisabledStyles(addSceneButton, true);
      stashConfigured = false;
      whisparrBaseUrl = null;
      void updateViewInStashButton(getParsedPage().stashIds[0], true);
      updateViewInWhisparrButton(getParsedPage().stashIds[0]);
      updateEntityControls();
    }
  };

  void updateConfigStatus();
  void updateSceneStatus(false);
  updateEntityControls();
  void loadCatalogs();

  document.documentElement.appendChild(panel);

  let lastUrl = window.location.href;
  const checkNavigation = () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      statusCache.clear();
      inFlight.clear();
      stashMatchCache.clear();
      stashLookupInFlight.clear();
      if (sceneCopyResetTimer !== null) {
        window.clearTimeout(sceneCopyResetTimer);
        sceneCopyResetTimer = null;
      }
      resetPerformerPanelState();
      resetStudioPanelState();
      updateDiagnostics();
      void updateConfigStatus();
      void updateSceneStatus(true);
    }
  };

  window.addEventListener('popstate', checkNavigation);
  window.setInterval(checkNavigation, 500);
}

type SceneCardData = { sceneId: string; sceneUrl: string };
type SceneCardMeta = {
  sceneId: string;
  sceneUrl: string;
  title?: string;
  year?: number;
};

class SceneCardObserver {
  // Dev checklist: missing indicator renders for hasFile=false, search triggers background, UI shows loading/success/error.
  private observer: MutationObserver | null = null;
  private injectedByCard = new Map<HTMLElement, HTMLElement>();
  private statusBySceneId = createTtlCache<
    string,
    {
      exists: boolean;
      whisparrId?: number;
      monitored?: boolean;
      tagIds?: number[];
      hasFile?: boolean;
      excluded?: boolean;
      title?: string;
      year?: number;
      statusKnown?: boolean;
    }
  >({ ttlMs: 0 });
  private statusIndicatorBySceneId = new Map<
    string,
    {
      setState: (
        state: 'loading' | 'in' | 'out' | 'excluded' | 'error' | 'missing',
      ) => void;
    }
  >();
  private actionBySceneId = new Map<
    string,
    {
      button: HTMLButtonElement;
      setStatus: (
        state: 'loading' | 'in' | 'out' | 'excluded' | 'error' | 'missing',
      ) => void;
    }
  >();
  private viewBySceneId = new Map<
    string,
    {
      whisparrButton: HTMLButtonElement;
      stashButton: HTMLButtonElement;
      setWhisparrEnabled: (enabled: boolean) => void;
      setStashEnabled: (enabled: boolean, title?: string) => void;
    }
  >();
  private stashMatchBySceneId = new Map<
    string,
    { found: boolean; stashSceneUrl?: string; error?: string }
  >();
  private stashLookupInFlight = new Set<string>();
  private whisparrBaseUrl: string | null = null;
  private stashConfigured = false;
  private searchOnAdd = true;
  private excludeBySceneId = new Map<
    string,
    {
      button: HTMLButtonElement;
      setState: (
        state: 'idle' | 'loading' | 'error',
        excluded: boolean,
      ) => void;
    }
  >();
  private monitorBySceneId = new Map<
    string,
    {
      button: HTMLButtonElement;
      setState: (
        state: 'idle' | 'loading' | 'error',
        monitored: boolean | null,
        exists: boolean,
      ) => void;
    }
  >();
  private missingBySceneId = new Map<
    string,
    {
      wrap: HTMLElement;
      setState: (state: 'idle' | 'loading' | 'success' | 'error') => void;
    }
  >();
  private statusBatcher = createBatcher<SceneCardMeta>({
    maxBatch: Number.POSITIVE_INFINITY,
    maxWaitMs: 250,
    handler: (items) => this.handleStatusBatch(items),
  });

  start() {
    this.scan(document.body);
    void this.refreshLinkSettings();
    this.observer = createDebouncedMutationObserver({
      target: document.body,
      onChange: () => this.scan(document.body),
      debounceMs: 150,
    });
    createLocationObserver({
      onChange: () => {
        this.resetStatusCache();
        this.scan(document.body);
      },
      intervalMs: 500,
    });
  }

  private async refreshLinkSettings() {
    const runtime = extContent?.runtime;
    if (!runtime) return;
    try {
      const response = await sendMessage<'GET_SETTINGS'>(
        runtime as {
          sendMessage: (
            message: ExtensionRequest,
          ) => Promise<ExtensionResponse>;
        },
        { type: 'GET_SETTINGS' },
      );
      if (!response.ok || !response.settings) return;
      const baseUrl = response.settings.whisparrBaseUrl?.trim() ?? '';
      this.whisparrBaseUrl = baseUrl || null;
      this.stashConfigured = Boolean(
        response.settings.stashBaseUrl?.trim() &&
        response.settings.stashApiKey?.trim(),
      );
      this.searchOnAdd = response.settings.searchOnAdd ?? true;
    } catch {
      this.whisparrBaseUrl = null;
      this.stashConfigured = false;
    }
  }

  private async requestStashMatch(sceneId: string) {
    if (!this.stashConfigured) {
      return;
    }
    if (
      this.stashMatchBySceneId.has(sceneId) ||
      this.stashLookupInFlight.has(sceneId)
    ) {
      return;
    }
    const runtime = extContent?.runtime;
    if (!runtime) return;
    this.stashLookupInFlight.add(sceneId);
    try {
      const response = await runtime.sendMessage({
        type: 'STASH_FIND_SCENE_BY_STASHDB_ID',
        stashdbSceneId: sceneId,
      });
      if (!response.ok) {
        this.stashMatchBySceneId.set(sceneId, {
          found: false,
          error: response.error ?? 'unknown',
        });
        return;
      }
      this.stashMatchBySceneId.set(sceneId, {
        found: Boolean(response.found && response.stashSceneUrl),
        stashSceneUrl: response.stashSceneUrl,
      });
    } finally {
      this.stashLookupInFlight.delete(sceneId);
      const view = this.viewBySceneId.get(sceneId);
      if (view) {
        const match = this.stashMatchBySceneId.get(sceneId);
        view.setStashEnabled(
          Boolean(match?.found && match.stashSceneUrl),
          match?.found ? 'View in Stash' : 'No match in Stash',
        );
      }
    }
  }

  private resetStatusCache() {
    this.statusBatcher.clear();
    for (const [sceneId, entry] of this.statusBySceneId.entries()) {
      this.statusBySceneId.set(sceneId, {
        ...entry,
        statusKnown: false,
      });
    }
  }

  private scan(root: ParentNode) {
    this.cleanup();
    const anchors = Array.from(
      root.querySelectorAll<HTMLAnchorElement>('a[href^="/scenes/"]'),
    );
    for (const anchor of anchors) {
      const scene = this.extractScene(anchor);
      if (!scene) continue;
      const card = this.findCardContainer(anchor);
      if (!card) continue;
      if (card.dataset.stasharrAugmented === 'true') continue;
      if (card.querySelector('.stasharr-scene-card')) {
        card.dataset.stasharrAugmented = 'true';
        continue;
      }
      const injected = this.injectControls(card, scene, anchor);
      if (injected) {
        card.dataset.stasharrAugmented = 'true';
        this.injectedByCard.set(card, injected);
      }
      const cached = this.statusBySceneId.get(scene.sceneId) ?? {
        exists: false,
      };
      this.statusBySceneId.set(scene.sceneId, {
        ...cached,
        title: scene.title ?? cached.title,
        year: scene.year ?? cached.year,
        statusKnown: cached.statusKnown ?? false,
      });
      this.enqueueStatus(scene);
    }
  }

  private cleanup() {
    for (const [card, injected] of this.injectedByCard.entries()) {
      if (!card.isConnected) {
        injected.remove();
        this.injectedByCard.delete(card);
      }
    }
  }

  private extractScene(anchor: HTMLAnchorElement): SceneCardMeta | null {
    const href = anchor.getAttribute('href');
    if (!href) return null;
    let url: URL;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      return null;
    }
    const sceneId = extractSceneIdFromPathname(url.pathname);
    if (!sceneId) return null;
    const card = this.findCardContainer(anchor);
    let title: string | undefined;
    let year: number | undefined;
    if (card) {
      const titleEl =
        card.querySelector<HTMLHeadingElement>('.card-footer h6') ??
        card.querySelector<HTMLAnchorElement>('.card-footer a[title]') ??
        card.querySelector<HTMLAnchorElement>('.card-footer a');
      const rawTitle =
        titleEl?.getAttribute('title')?.trim() || titleEl?.textContent?.trim();
      if (rawTitle) {
        title = rawTitle;
      }
      const yearEl = card.querySelector<HTMLDivElement>('.card-footer strong');
      const rawYear = yearEl?.textContent?.trim();
      const yearMatch = rawYear?.match(/^(\d{4})/);
      if (yearMatch) {
        year = Number(yearMatch[1]);
      }
    }
    return { sceneId, sceneUrl: url.toString(), title, year };
  }

  private findCardContainer(anchor: HTMLAnchorElement): HTMLElement | null {
    const selectors = [
      '[class*="SceneCard"]',
      '[class*="Card"]',
      '[data-testid*="scene"]',
      'article',
      'li',
      '.card',
    ];
    for (const selector of selectors) {
      const match = anchor.closest(selector);
      if (match instanceof HTMLElement && match.tagName !== 'A') {
        return match;
      }
    }
    const fallback = anchor.closest(
      'article, li, .card, [class*="Card"], [class*="SceneCard"], [data-testid*="scene"]',
    );
    if (fallback instanceof HTMLElement && fallback.tagName !== 'A') {
      return fallback;
    }
    const explicit = anchor.closest('.SceneCard.card');
    if (explicit instanceof HTMLElement && explicit.tagName !== 'A') {
      return explicit;
    }
    return null;
  }

  private injectControls(
    card: HTMLElement,
    scene: SceneCardMeta,
    anchor: HTMLAnchorElement,
  ) {
    const container = document.createElement('div');
    container.className = 'stasharr-scene-card';
    container.style.display = 'flex';
    container.style.gap = '6px';
    container.style.alignItems = 'center';
    container.style.padding = '6px 10px';
    container.style.borderTop = '1px solid rgba(148, 163, 184, 0.25)';
    container.style.borderBottom = '1px solid rgba(148, 163, 184, 0.25)';
    container.style.background = 'rgba(15, 23, 42, 0.06)';
    container.style.color = '#0f172a';
    container.style.fontSize = '11px';

    const leftWrap = document.createElement('div');
    leftWrap.style.display = 'inline-flex';
    leftWrap.style.alignItems = 'center';
    leftWrap.style.gap = '6px';
    container.appendChild(leftWrap);

    const statusIndicator = createStatusIndicator({ state: 'out' });
    const statusOverlay = statusIndicator.element;

    const actionButton = createIconButton({
      label: 'Add to Whisparr',
      icon: 'download',
      variant: 'action',
    });
    leftWrap.appendChild(actionButton);

    const viewWhisparrButton = createIconButton({
      label: 'View in Whisparr',
      icon: 'external-link',
      variant: 'view-whisparr',
      disabled: true,
      title: 'View in Whisparr',
    });
    const whisparrIcon = document.createElement('img');
    whisparrIcon.src =
      'https://raw.githubusercontent.com/Whisparr/Whisparr/refs/heads/eros/Logo/Whisparr.svg';
    whisparrIcon.alt = '';
    whisparrIcon.width = 16;
    whisparrIcon.height = 16;
    whisparrIcon.style.display = 'block';
    viewWhisparrButton.innerHTML = '';
    viewWhisparrButton.appendChild(whisparrIcon);

    const viewStashButton = createIconButton({
      label: 'View in Stash',
      icon: 'external-link',
      variant: 'view-stash',
      disabled: true,
      title: 'View in Stash',
    });
    const stashIcon = document.createElement('img');
    stashIcon.src = 'https://stashapp.cc/images/stash.svg';
    stashIcon.alt = '';
    stashIcon.width = 16;
    stashIcon.height = 16;
    stashIcon.style.display = 'block';
    viewStashButton.innerHTML = '';
    viewStashButton.appendChild(stashIcon);
    const viewWrap = document.createElement('div');
    viewWrap.style.display = 'inline-flex';
    viewWrap.style.alignItems = 'center';
    viewWrap.style.gap = '6px';
    viewWrap.style.marginLeft = 'auto';
    viewWrap.appendChild(viewWhisparrButton);
    viewWrap.appendChild(viewStashButton);

    const copyButton = createIconButton({
      label: 'Copy StashDB scene ID',
      icon: 'copy',
      variant: 'copy',
      title: 'Copy StashDB scene ID',
    });
    viewWrap.appendChild(copyButton);
    container.appendChild(viewWrap);

    const missingWrap = document.createElement('div');
    missingWrap.dataset.stasharrMissing = 'true';
    missingWrap.style.display = 'none';
    missingWrap.style.alignItems = 'center';
    missingWrap.style.gap = '4px';
    leftWrap.appendChild(missingWrap);

    const searchButton = createIconButton({
      label: 'Trigger Whisparr search',
      icon: 'search',
      variant: 'search',
      title: 'Trigger Whisparr search',
    });
    missingWrap.appendChild(searchButton);

    const excludeButton = createIconButton({
      label: 'Exclude from Whisparr',
      icon: 'ban',
      variant: 'exclude',
      disabled: true,
      title: 'Exclusion status loading',
    });
    excludeButton.setAttribute('aria-label', 'Exclusion status loading');
    leftWrap.appendChild(excludeButton);

    const monitorButton = createIconButton({
      label: 'Monitor in Whisparr',
      icon: 'bookmark',
      variant: 'monitor',
      disabled: true,
      title: 'Monitor in Whisparr',
    });
    leftWrap.appendChild(monitorButton);

    const setStatus = (
      state: 'loading' | 'in' | 'out' | 'excluded' | 'error' | 'missing',
    ) => {
      switch (state) {
        case 'loading':
          statusIndicator.setState('loading');
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.cursor = 'not-allowed';
          actionButton.style.background = '#d8b4fe';
          actionButton.style.borderColor = '#d8b4fe';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Adding to Whisparr');
          return;
        case 'in':
          statusIndicator.setState('in');
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.cursor = 'not-allowed';
          actionButton.style.background = '#d8b4fe';
          actionButton.style.borderColor = '#d8b4fe';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Already in Whisparr');
          return;
        case 'missing':
          statusIndicator.setState('missing');
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.cursor = 'not-allowed';
          actionButton.style.background = '#d8b4fe';
          actionButton.style.borderColor = '#d8b4fe';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'In Whisparr (missing file)');
          return;
        case 'excluded':
          statusIndicator.setState('excluded');
          actionButton.disabled = true;
          actionButton.style.opacity = '0.6';
          actionButton.style.cursor = 'not-allowed';
          actionButton.setAttribute('aria-label', 'Excluded from Whisparr');
          return;
        case 'error':
          statusIndicator.setState('error');
          actionButton.disabled = false;
          actionButton.style.opacity = '1';
          actionButton.style.cursor = 'pointer';
          actionButton.style.background = '#c084fc';
          actionButton.style.borderColor = '#c084fc';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Error, try again');
          return;
        case 'out':
        default:
          statusIndicator.setState('out');
          actionButton.disabled = false;
          actionButton.style.opacity = '1';
          actionButton.style.cursor = 'pointer';
          actionButton.style.background = '#c084fc';
          actionButton.style.borderColor = '#c084fc';
          actionButton.style.color = '#ffffff';
          actionButton.setAttribute('aria-label', 'Add to Whisparr');
      }
    };

    const setWhisparrEnabled = (enabled: boolean) => {
      setButtonState(viewWhisparrButton, enabled ? 'enabled' : 'disabled');
      viewWhisparrButton.title = enabled
        ? 'View in Whisparr'
        : 'No match in Whisparr';
    };

    const setStashEnabled = (enabled: boolean, title?: string) => {
      setButtonState(viewStashButton, enabled ? 'enabled' : 'disabled');
      viewStashButton.title =
        title ?? (enabled ? 'View in Stash' : 'No match in Stash');
    };

    const setStashLoading = () => {
      setButtonState(viewStashButton, 'disabled');
      viewStashButton.title = 'Checking Stash...';
      viewStashButton.innerHTML = renderIcon('spinner', { spin: true });
    };

    const setMissingState = (
      state: 'idle' | 'loading' | 'success' | 'error',
    ) => {
      switch (state) {
        case 'loading':
          searchButton.disabled = true;
          searchButton.style.opacity = '0.6';
          searchButton.style.background = '#69b66d';
          searchButton.style.borderColor = '#69b66d';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = renderIcon('spinner', { spin: true });
          return;
        case 'success':
          searchButton.disabled = true;
          searchButton.style.opacity = '0.8';
          searchButton.style.background = '#69b66d';
          searchButton.style.borderColor = '#69b66d';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = renderIcon('circle-check');
          return;
        case 'error':
          searchButton.disabled = false;
          searchButton.style.opacity = '1';
          searchButton.style.background = '#00853d';
          searchButton.style.borderColor = '#00853d';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = renderIcon('x');
          return;
        case 'idle':
        default:
          searchButton.disabled = false;
          searchButton.style.opacity = '1';
          searchButton.style.background = '#00853d';
          searchButton.style.borderColor = '#00853d';
          searchButton.style.color = '#ffffff';
          searchButton.innerHTML = renderIcon('search');
      }
    };

    const setExcludeState = (
      state: 'idle' | 'loading' | 'error',
      excluded: boolean,
    ) => {
      switch (state) {
        case 'loading':
          excludeButton.disabled = true;
          excludeButton.style.opacity = '0.6';
          excludeButton.style.cursor = 'not-allowed';
          excludeButton.innerHTML = renderIcon('spinner', { spin: true });
          return;
        case 'error':
          excludeButton.disabled = false;
          excludeButton.style.opacity = '1';
          excludeButton.style.cursor = 'pointer';
          excludeButton.innerHTML = renderIcon('x');
          return;
        case 'idle':
        default:
          excludeButton.disabled = false;
          excludeButton.style.opacity = '1';
          excludeButton.style.cursor = 'pointer';
          excludeButton.innerHTML = excluded
            ? renderIcon('circle-check')
            : renderIcon('ban');
          excludeButton.style.background = excluded ? '#9ca3af' : '#c4273c';
          excludeButton.style.borderColor = excluded ? '#9ca3af' : '#c4273c';
      }
    };

    const setMonitorState = (
      state: 'idle' | 'loading' | 'error',
      monitored: boolean | null,
      exists: boolean,
    ) => {
      if (!exists) {
        monitorButton.disabled = true;
        monitorButton.style.opacity = '0.6';
        monitorButton.style.cursor = 'not-allowed';
        monitorButton.innerHTML = renderIcon('bookmark');
        monitorButton.setAttribute('aria-label', 'Not in Whisparr');
        monitorButton.title = 'Not in Whisparr';
        return;
      }

      if (state === 'loading') {
        monitorButton.disabled = true;
        monitorButton.style.opacity = '0.6';
        monitorButton.style.cursor = 'not-allowed';
        monitorButton.innerHTML = renderIcon('spinner', { spin: true });
        monitorButton.setAttribute('aria-label', 'Updating monitor status');
        monitorButton.title = 'Updating monitor status';
        return;
      }

      if (state === 'error') {
        monitorButton.disabled = false;
        monitorButton.style.opacity = '1';
        monitorButton.style.cursor = 'pointer';
        monitorButton.innerHTML = renderIcon('x');
        monitorButton.setAttribute('aria-label', 'Monitor update failed');
        monitorButton.title = 'Monitor update failed';
        return;
      }

      const isMonitored = Boolean(monitored);
      monitorButton.disabled = false;
      monitorButton.style.opacity = '1';
      monitorButton.style.cursor = 'pointer';
      monitorButton.innerHTML = renderIcon(
        isMonitored ? 'bookmark-filled' : 'bookmark',
      );
      monitorButton.setAttribute(
        'aria-label',
        isMonitored ? 'Monitored in Whisparr' : 'Unmonitored in Whisparr',
      );
      monitorButton.title = isMonitored
        ? 'Monitored in Whisparr'
        : 'Unmonitored in Whisparr';
    };

    let copyResetTimer: number | null = null;
    const setCopyState = (state: 'idle' | 'loading' | 'success' | 'error') => {
      switch (state) {
        case 'loading':
          setButtonState(copyButton, 'disabled');
          copyButton.innerHTML = renderIcon('spinner', { spin: true });
          copyButton.style.background = '#94a3b8';
          copyButton.style.borderColor = '#94a3b8';
          copyButton.style.color = '#ffffff';
          copyButton.setAttribute('aria-label', 'Copying scene ID');
          copyButton.title = 'Copying scene ID';
          return;
        case 'success':
          setButtonState(copyButton, 'disabled');
          copyButton.innerHTML = renderIcon('circle-check');
          copyButton.style.background = '#22c55e';
          copyButton.style.borderColor = '#22c55e';
          copyButton.style.color = '#ffffff';
          copyButton.setAttribute('aria-label', 'Scene ID copied');
          copyButton.title = 'Scene ID copied';
          return;
        case 'error':
          setButtonState(copyButton, 'disabled');
          copyButton.innerHTML = renderIcon('x');
          copyButton.style.background = '#ef4444';
          copyButton.style.borderColor = '#ef4444';
          copyButton.style.color = '#ffffff';
          copyButton.setAttribute('aria-label', 'Copy failed');
          copyButton.title = 'Copy failed';
          return;
        case 'idle':
        default:
          setButtonState(copyButton, 'enabled');
          copyButton.innerHTML = renderIcon('copy');
          copyButton.style.background = '#e2e8f0';
          copyButton.style.borderColor = '#334155';
          copyButton.style.color = '#0f172a';
          copyButton.setAttribute('aria-label', 'Copy StashDB scene ID');
          copyButton.title = 'Copy StashDB scene ID';
      }
    };

    setStatus('out');
    setCopyState('idle');
    const cachedStatus = this.statusBySceneId.get(scene.sceneId);
    if (cachedStatus) {
      setStatus(cachedStatus.exists ? 'in' : 'out');
      if (cachedStatus.exists && cachedStatus.hasFile === false) {
        missingWrap.style.display = 'inline-flex';
        setMissingState('idle');
      } else if (cachedStatus.exists) {
        missingWrap.style.display = 'inline-flex';
        setMissingState('success');
      } else {
        missingWrap.style.display = 'none';
      }
      excludeButton.style.display = 'inline-flex';
      setExcludeState('idle', Boolean(cachedStatus.excluded));
      setWhisparrEnabled(Boolean(cachedStatus.exists && this.whisparrBaseUrl));
      setMonitorState(
        'idle',
        cachedStatus.monitored ?? null,
        cachedStatus.exists,
      );
      const stashMatch = this.stashMatchBySceneId.get(scene.sceneId);
      if (stashMatch?.found && stashMatch.stashSceneUrl) {
        setStashEnabled(true, 'View in Stash');
      } else {
        setStashEnabled(
          false,
          this.stashConfigured ? 'Checking Stash...' : 'Stash not configured',
        );
      }
      void this.requestStashMatch(scene.sceneId);
      if (cachedStatus.exists) {
        excludeButton.disabled = true;
        excludeButton.style.opacity = '0.6';
        excludeButton.style.cursor = 'not-allowed';
        excludeButton.setAttribute(
          'aria-label',
          cachedStatus.excluded
            ? 'Excluded (managed outside Whisparr)'
            : 'Exclude (managed outside Whisparr)',
        );
        excludeButton.title = cachedStatus.excluded
          ? 'Excluded (managed outside Whisparr)'
          : 'Exclude (managed outside Whisparr)';
      } else {
        excludeButton.disabled = false;
        excludeButton.style.opacity = '1';
        excludeButton.style.cursor = 'pointer';
        excludeButton.setAttribute(
          'aria-label',
          cachedStatus.excluded ? 'Remove exclusion' : 'Exclude from Whisparr',
        );
        excludeButton.title = cachedStatus.excluded
          ? 'Remove exclusion'
          : 'Exclude from Whisparr';
      }
    } else {
      setWhisparrEnabled(false);
      setStashEnabled(
        false,
        this.stashConfigured ? 'Checking Stash...' : 'Stash not configured',
      );
      void this.requestStashMatch(scene.sceneId);
      setMonitorState('idle', null, false);
    }

    copyButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (copyResetTimer !== null) {
        window.clearTimeout(copyResetTimer);
        copyResetTimer = null;
      }
      setCopyState('loading');
      const result = await copyTextToClipboard(scene.sceneId);
      setCopyState(result.ok ? 'success' : 'error');
      copyResetTimer = window.setTimeout(() => {
        setCopyState('idle');
      }, 1600);
    });

    actionButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      setStatus('loading');
      const runtime = extContent?.runtime;
      if (!runtime) {
        setStatus('error');
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_ADD',
          sceneId: scene.sceneId,
          sceneUrl: scene.sceneUrl,
          searchOnAdd: this.searchOnAdd,
        });
        setStatus(response.ok ? 'in' : 'error');
      } catch {
        setStatus('error');
      }
    });

    viewWhisparrButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cached = this.statusBySceneId.get(scene.sceneId);
      if (!cached?.exists || !this.whisparrBaseUrl) return;
      const url = buildWhisparrSceneUrl(this.whisparrBaseUrl, scene.sceneId);
      void openExternalLink(url);
    });

    viewStashButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.stashConfigured) {
        setStashEnabled(false, 'Stash not configured');
        return;
      }
      const cached = this.stashMatchBySceneId.get(scene.sceneId);
      if (cached?.found && cached.stashSceneUrl) {
        void openExternalLink(cached.stashSceneUrl);
        return;
      }
      const runtime = extContent?.runtime;
      if (!runtime) {
        setStashEnabled(false, 'Lookup unavailable');
        return;
      }
      setStashLoading();
      try {
        const response = await runtime.sendMessage({
          type: 'STASH_FIND_SCENE_BY_STASHDB_ID',
          stashdbSceneId: scene.sceneId,
        });
        if (!response.ok) {
          this.stashMatchBySceneId.set(scene.sceneId, {
            found: false,
            error: response.error ?? 'unknown',
          });
          setStashEnabled(false, 'Lookup failed');
          return;
        }
        const found = Boolean(response.found && response.stashSceneUrl);
        this.stashMatchBySceneId.set(scene.sceneId, {
          found,
          stashSceneUrl: response.stashSceneUrl,
        });
        if (found && response.stashSceneUrl) {
          setStashEnabled(true);
          void openExternalLink(response.stashSceneUrl);
        } else {
          setStashEnabled(false, 'No match in Stash');
        }
      } catch {
        setStashEnabled(false, 'Lookup failed');
      }
    });

    searchButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cached = this.statusBySceneId.get(scene.sceneId);
      if (!cached?.whisparrId) {
        setMissingState('error');
        return;
      }
      setMissingState('loading');
      const runtime = extContent?.runtime;
      if (!runtime) {
        setMissingState('error');
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_TRIGGER_SEARCH',
          whisparrId: cached.whisparrId,
        });
        if (!response.ok) {
          setMissingState('error');
          return;
        }
        setMissingState('success');
        window.setTimeout(() => {
          this.statusBatcher.enqueue(scene);
          void this.statusBatcher.flush();
        }, 8000);
      } catch {
        setMissingState('error');
      }
    });

    excludeButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cached = this.statusBySceneId.get(scene.sceneId);
      if (cached?.exists) {
        return;
      }
      const nextExcluded = !Boolean(cached?.excluded);
      setExcludeState('loading', nextExcluded);
      const runtime = extContent?.runtime;
      if (!runtime) {
        setExcludeState('error', Boolean(cached?.excluded));
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SCENE_CARD_SET_EXCLUDED',
          sceneId: scene.sceneId,
          excluded: nextExcluded,
          movieTitle: cached?.title ?? scene.title,
          movieYear: cached?.year ?? scene.year,
        });
        if (!response.ok) {
          setExcludeState('error', Boolean(cached?.excluded));
          return;
        }
        if (cached) {
          cached.excluded = response.excluded ?? nextExcluded;
        }
        setExcludeState('idle', Boolean(cached?.excluded ?? nextExcluded));
        this.applyStatusResults([
          {
            sceneId: scene.sceneId,
            exists: cached?.exists ?? false,
            hasFile: cached?.hasFile,
            excluded: cached?.excluded ?? nextExcluded,
          },
        ]);
      } catch {
        setExcludeState('error', Boolean(cached?.excluded));
      }
    });

    monitorButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cached = this.statusBySceneId.get(scene.sceneId);
      if (!cached?.exists || !cached.whisparrId) {
        setMonitorState('idle', cached?.monitored ?? null, false);
        return;
      }
      const nextState = !Boolean(cached.monitored);
      setMonitorState('loading', cached.monitored ?? null, true);
      const runtime = extContent?.runtime;
      if (!runtime) {
        setMonitorState('error', cached.monitored ?? null, true);
        return;
      }
      try {
        const response = await runtime.sendMessage({
          type: 'SET_MONITOR_STATE',
          whisparrId: cached.whisparrId,
          monitored: nextState,
        });
        if (!response.ok) {
          setMonitorState('error', cached.monitored ?? null, true);
          return;
        }
        cached.monitored = response.monitored ?? nextState;
        setMonitorState('idle', cached.monitored ?? null, true);
      } catch {
        setMonitorState('error', cached.monitored ?? null, true);
      }
    });

    container.dataset.sceneId = scene.sceneId;
    container.dataset.sceneStatus = 'out';

    const imageAnchor =
      card.querySelector<HTMLAnchorElement>('a.SceneCard-image') ?? anchor;
    if (imageAnchor) {
      const computed = window.getComputedStyle(imageAnchor);
      if (computed.position === 'static') {
        imageAnchor.style.position = 'relative';
      }
      if (!imageAnchor.querySelector('.stasharr-scene-card-status')) {
        imageAnchor.appendChild(statusOverlay);
      }
    } else {
      container.insertBefore(statusOverlay, container.firstChild);
    }

    this.statusIndicatorBySceneId.set(scene.sceneId, {
      setState: statusIndicator.setState,
    });
    this.actionBySceneId.set(scene.sceneId, {
      button: actionButton,
      setStatus,
    });
    this.viewBySceneId.set(scene.sceneId, {
      whisparrButton: viewWhisparrButton,
      stashButton: viewStashButton,
      setWhisparrEnabled,
      setStashEnabled,
    });
    this.missingBySceneId.set(scene.sceneId, {
      wrap: missingWrap,
      setState: setMissingState,
    });
    this.excludeBySceneId.set(scene.sceneId, {
      button: excludeButton,
      setState: setExcludeState,
    });
    this.monitorBySceneId.set(scene.sceneId, {
      button: monitorButton,
      setState: setMonitorState,
    });

    const footer =
      card.querySelector('.card-footer') ??
      card.querySelector('[class*="CardFooter"]') ??
      card.querySelector('[class*="Footer"]') ??
      card.querySelector('[data-testid*="footer"]');
    const body =
      card.querySelector('.SceneCard-body') ??
      card.querySelector('[class*="CardBody"]') ??
      card.querySelector('[class*="Body"]') ??
      card.querySelector('[data-testid*="body"]');
    if (body && body.parentElement === card) {
      card.insertBefore(container, body.nextSibling);
    } else if (footer && footer.parentElement === card) {
      card.insertBefore(container, footer);
    } else {
      card.appendChild(container);
    }
    return container;
  }

  private enqueueStatus(scene: SceneCardMeta) {
    const cached = this.statusBySceneId.get(scene.sceneId);
    if (cached?.statusKnown) {
      return;
    }
    this.statusBatcher.enqueue(scene);
  }

  private async handleStatusBatch(items: SceneCardMeta[]) {
    if (items.length === 0) return;
    const runtime = extContent?.runtime;
    if (!runtime) return;
    const deduped = new Map<string, SceneCardMeta>();
    for (const item of items) {
      deduped.set(item.sceneId, item);
    }
    const requestItems = Array.from(deduped.values());
    try {
      const response = await runtime.sendMessage({
        type: 'SCENE_CARDS_CHECK_STATUS',
        items: requestItems,
      });
      if (!response.ok || !response.results) {
        this.applyStatusError(requestItems.map((item) => item.sceneId));
        return;
      }
      for (const result of response.results) {
        const existing = this.statusBySceneId.get(result.sceneId);
        this.statusBySceneId.set(result.sceneId, {
          exists: result.exists,
          whisparrId: result.whisparrId,
          monitored: result.monitored,
          tagIds: result.tagIds,
          hasFile: result.hasFile,
          excluded: result.excluded,
          title: existing?.title,
          year: existing?.year,
          statusKnown: true,
        });
      }
      this.applyStatusResults(response.results);
    } catch {
      this.applyStatusError(requestItems.map((item) => item.sceneId));
    }
  }

  private applyStatusResults(
    results: Array<{
      sceneId: string;
      exists: boolean;
      hasFile?: boolean;
      excluded?: boolean;
    }>,
  ) {
    for (const result of results) {
      const action = this.actionBySceneId.get(result.sceneId);
      if (action) {
        if (result.excluded) {
          action.setStatus('excluded');
        } else if (result.exists && result.hasFile === false) {
          action.setStatus('missing');
        } else if (result.exists) {
          action.setStatus('in');
        } else {
          action.setStatus('out');
        }
      }
      const view = this.viewBySceneId.get(result.sceneId);
      if (view) {
        const cached = this.statusBySceneId.get(result.sceneId);
        view.setWhisparrEnabled(
          Boolean(cached?.exists && this.whisparrBaseUrl),
        );
        const stashMatch = this.stashMatchBySceneId.get(result.sceneId);
        if (stashMatch?.found && stashMatch.stashSceneUrl) {
          view.setStashEnabled(true, 'View in Stash');
        } else {
          view.setStashEnabled(
            false,
            this.stashConfigured ? 'Checking Stash...' : 'Stash not configured',
          );
          void this.requestStashMatch(result.sceneId);
        }
      }
      const missing = this.missingBySceneId.get(result.sceneId);
      if (missing) {
        if (result.exists) {
          missing.wrap.style.display = 'inline-flex';
          if (result.hasFile === false) {
            missing.setState('idle');
          } else {
            missing.setState('success');
          }
        } else {
          missing.wrap.style.display = 'none';
        }
      }
      const exclude = this.excludeBySceneId.get(result.sceneId);
      if (exclude) {
        if (result.exists) {
          exclude.button.style.display = 'inline-flex';
          exclude.setState('idle', Boolean(result.excluded));
          exclude.button.disabled = true;
          exclude.button.style.opacity = '0.6';
          exclude.button.style.cursor = 'not-allowed';
          exclude.button.setAttribute(
            'aria-label',
            result.excluded
              ? 'Excluded (managed outside Whisparr)'
              : 'Exclude (managed outside Whisparr)',
          );
          exclude.button.title = result.excluded
            ? 'Excluded (managed outside Whisparr)'
            : 'Exclude (managed outside Whisparr)';
        } else {
          exclude.button.style.display = 'inline-flex';
          exclude.button.disabled = false;
          exclude.button.style.opacity = '1';
          exclude.button.style.cursor = 'pointer';
          exclude.setState('idle', Boolean(result.excluded));
          exclude.button.setAttribute(
            'aria-label',
            result.excluded ? 'Remove exclusion' : 'Exclude from Whisparr',
          );
          exclude.button.title = result.excluded
            ? 'Remove exclusion'
            : 'Exclude from Whisparr';
        }
      }
      const monitor = this.monitorBySceneId.get(result.sceneId);
      if (monitor) {
        const cached = this.statusBySceneId.get(result.sceneId);
        monitor.setState(
          'idle',
          cached?.monitored ?? null,
          Boolean(result.exists),
        );
      }
    }
  }

  private applyStatusError(sceneIds: string[]) {
    for (const sceneId of sceneIds) {
      const indicator = this.statusIndicatorBySceneId.get(sceneId);
      if (!indicator) continue;
      indicator.setState('error');
      const action = this.actionBySceneId.get(sceneId);
      if (action) {
        action.setStatus('error');
      }
      const exclude = this.excludeBySceneId.get(sceneId);
      if (exclude) {
        exclude.button.style.display = 'inline-flex';
        exclude.setState('error', false);
        exclude.button.disabled = true;
        exclude.button.style.opacity = '0.6';
        exclude.button.style.cursor = 'not-allowed';
        exclude.button.setAttribute(
          'aria-label',
          'Exclusion status unavailable',
        );
        exclude.button.title = 'Exclusion status unavailable';
      }
      const view = this.viewBySceneId.get(sceneId);
      if (view) {
        view.setWhisparrEnabled(false);
        view.setStashEnabled(false, 'Lookup unavailable');
      }
      const monitor = this.monitorBySceneId.get(sceneId);
      if (monitor) {
        monitor.setState('error', null, false);
      }
    }
  }

  private findInjectedBySceneId(sceneId: string) {
    for (const node of this.injectedByCard.values()) {
      if (node.dataset.sceneId === sceneId) {
        return node;
      }
    }
    return null;
  }
}

if (!isEditPage) {
  const sceneCardObserver = new SceneCardObserver();
  sceneCardObserver.start();
}
