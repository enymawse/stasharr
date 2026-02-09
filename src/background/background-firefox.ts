import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type ExtensionResponse,
} from '../shared/messages.js';
import { getSettings, resetSettings, saveSettings } from '../shared/storage.js';
import {
  createBackgroundHandler,
  createBaseHandlers,
  registerBackgroundListener,
} from './core.js';
import { handleFetchJson } from './http.js';
import {
  handleAddScene,
  handleCheckSceneStatus,
  handleFetchDiscoveryCatalogs,
  handleSaveSelections,
  handleSceneCardAction,
  handleSceneCardAdd,
  handleSceneCardsCheckStatus,
  handleSceneCardSetExcluded,
  handleSceneCardTriggerSearch,
  handleSetMonitorState,
  handleUpdateQualityProfile,
  handleUpdateTags,
  handleValidateWhisparrConnection,
  handlePerformerAdd,
  handlePerformerCheckStatus,
  handlePerformerSetMonitor,
  handlePerformerUpdateQualityProfile,
  handlePerformerUpdateTags,
  handleStudioAdd,
  handleStudioCheckStatus,
  handleStudioSetMonitor,
  handleStudioUpdateQualityProfile,
  handleStudioUpdateTags,
} from './services/whisparr.js';
import {
  handleStashFindSceneByStashdbId,
  handleValidateStashConnection,
} from './services/stash.js';

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
    openOptionsPage?: () => void;
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

const baseHandlers = createBaseHandlers({
  messageTypes: {
    ping: MESSAGE_TYPES_BG.ping,
    getSettings: MESSAGE_TYPES_BG.getSettings,
    getConfigStatus: MESSAGE_TYPES_BG.getConfigStatus,
    openOptionsPage: MESSAGE_TYPES_BG.openOptionsPage,
  },
  version: VERSION,
  getSettings,
  openOptionsPage: ext.runtime.openOptionsPage,
});

const handlers: Record<
  string,
  (request: any) => Promise<ExtensionResponse> | ExtensionResponse
> = {
  ...baseHandlers,
  [MESSAGE_TYPES_BG.fetchJson]: handleFetchJson,
  [MESSAGE_TYPES_BG.validateConnection]: (request) =>
    (request as { kind?: string }).kind === 'stash'
      ? handleValidateStashConnection(request)
      : handleValidateWhisparrConnection(request),
  [MESSAGE_TYPES_BG.saveSettings]: async (request) => {
    const settings = await saveSettings((request as { settings: any }).settings);
    return { ok: true, type: MESSAGE_TYPES_BG.saveSettings, settings };
  },
  [MESSAGE_TYPES_BG.resetSettings]: async () => {
    await resetSettings();
    return { ok: true, type: MESSAGE_TYPES_BG.resetSettings };
  },
  [MESSAGE_TYPES_BG.fetchDiscoveryCatalogs]: handleFetchDiscoveryCatalogs,
  [MESSAGE_TYPES_BG.saveSelections]: handleSaveSelections,
  [MESSAGE_TYPES_BG.checkSceneStatus]: handleCheckSceneStatus,
  [MESSAGE_TYPES_BG.addScene]: handleAddScene,
  [MESSAGE_TYPES_BG.setMonitorState]: handleSetMonitorState,
  [MESSAGE_TYPES_BG.updateTags]: handleUpdateTags,
  [MESSAGE_TYPES_BG.updateQualityProfile]: handleUpdateQualityProfile,
  [MESSAGE_TYPES_BG.sceneCardActionRequested]: handleSceneCardAction,
  [MESSAGE_TYPES_BG.sceneCardsCheckStatus]: handleSceneCardsCheckStatus,
  [MESSAGE_TYPES_BG.sceneCardAdd]: handleSceneCardAdd,
  [MESSAGE_TYPES_BG.sceneCardTriggerSearch]: handleSceneCardTriggerSearch,
  [MESSAGE_TYPES_BG.sceneCardSetExcluded]: handleSceneCardSetExcluded,
  [MESSAGE_TYPES_BG.performerCheckStatus]: handlePerformerCheckStatus,
  [MESSAGE_TYPES_BG.performerAdd]: handlePerformerAdd,
  [MESSAGE_TYPES_BG.performerSetMonitor]: handlePerformerSetMonitor,
  [MESSAGE_TYPES_BG.performerUpdateTags]: handlePerformerUpdateTags,
  [MESSAGE_TYPES_BG.performerUpdateQualityProfile]:
    handlePerformerUpdateQualityProfile,
  [MESSAGE_TYPES_BG.studioCheckStatus]: handleStudioCheckStatus,
  [MESSAGE_TYPES_BG.studioAdd]: handleStudioAdd,
  [MESSAGE_TYPES_BG.studioSetMonitor]: handleStudioSetMonitor,
  [MESSAGE_TYPES_BG.studioUpdateTags]: handleStudioUpdateTags,
  [MESSAGE_TYPES_BG.studioUpdateQualityProfile]:
    handleStudioUpdateQualityProfile,
  [MESSAGE_TYPES_BG.stashFindSceneByStashdbId]: handleStashFindSceneByStashdbId,
  [MESSAGE_TYPES_BG.requestPermission]: async (request) => {
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
        origins: [(request as { origin: string }).origin],
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
  },
  [MESSAGE_TYPES_BG.getPermission]: async (request) => {
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
        origins: [(request as { origin: string }).origin],
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
  },
};

const handleMessage = createBackgroundHandler({
  handlers,
  unknownResponse: {
    ok: false,
    type: MESSAGE_TYPES_BG.fetchJson,
    error: 'Unknown message type',
  },
});

registerBackgroundListener({
  ext,
  handleMessage: (request) => handleMessage(request as ExtensionRequest),
  onError: (error) => ({
    ok: false,
    type: MESSAGE_TYPES_BG.fetchJson,
    error: `Unhandled error: ${error.message}`,
  }),
});
