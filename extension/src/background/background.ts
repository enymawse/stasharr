import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type ExtensionResponse,
} from '../shared/messages.js';
import { getSettings, resetSettings, saveSettings } from '../shared/storage.js';
import { createMessageRouter } from '../shared/messaging.js';
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

ext.runtime.onMessage.addListener(
  (
    request: ExtensionRequest,
    _sender: unknown,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    const respond = async (): Promise<ExtensionResponse> => {
      const router = createMessageRouter({
        [MESSAGE_TYPES_BG.ping]: async () => ({
          ok: true,
          type: MESSAGE_TYPES_BG.ping,
          version: VERSION,
          timestamp: new Date().toISOString(),
        }),
        [MESSAGE_TYPES_BG.getSettings]: async () => {
          const settings = await getSettings();
          return { ok: true, type: MESSAGE_TYPES_BG.getSettings, settings };
        },
        [MESSAGE_TYPES_BG.getConfigStatus]: async () => {
          const settings = await getSettings();
          const configured = Boolean(
            settings.whisparrBaseUrl && settings.whisparrApiKey,
          );
          return {
            ok: true,
            type: MESSAGE_TYPES_BG.getConfigStatus,
            configured,
          };
        },
        [MESSAGE_TYPES_BG.openOptionsPage]: async () => {
          if (ext.runtime.openOptionsPage) {
            ext.runtime.openOptionsPage();
            return { ok: true, type: MESSAGE_TYPES_BG.openOptionsPage };
          }
          return {
            ok: false,
            type: MESSAGE_TYPES_BG.openOptionsPage,
            error: 'openOptionsPage not available.',
          };
        },
      });

      const routed = router.handle(request);
      if (routed) {
        return routed;
      }

      if (request?.type === MESSAGE_TYPES_BG.fetchJson) {
        return handleFetchJson(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.validateConnection) {
        if (request.kind === 'stash') {
          return handleValidateStashConnection(request);
        }
        return handleValidateWhisparrConnection(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.saveSettings) {
        const settings = await saveSettings(request.settings);
        return { ok: true, type: MESSAGE_TYPES_BG.saveSettings, settings };
      }

      if (request?.type === MESSAGE_TYPES_BG.resetSettings) {
        await resetSettings();
        return { ok: true, type: MESSAGE_TYPES_BG.resetSettings };
      }

      if (request?.type === MESSAGE_TYPES_BG.fetchDiscoveryCatalogs) {
        return handleFetchDiscoveryCatalogs(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.saveSelections) {
        return handleSaveSelections(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.checkSceneStatus) {
        return handleCheckSceneStatus(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.addScene) {
        return handleAddScene(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.setMonitorState) {
        return handleSetMonitorState(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.updateTags) {
        return handleUpdateTags(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.updateQualityProfile) {
        return handleUpdateQualityProfile(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.sceneCardActionRequested) {
        return handleSceneCardAction(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.sceneCardsCheckStatus) {
        return handleSceneCardsCheckStatus(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.sceneCardAdd) {
        return handleSceneCardAdd(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.sceneCardTriggerSearch) {
        return handleSceneCardTriggerSearch(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.sceneCardSetExcluded) {
        return handleSceneCardSetExcluded(request);
      }

      if (request?.type === MESSAGE_TYPES_BG.stashFindSceneByStashdbId) {
        return handleStashFindSceneByStashdbId(request);
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
