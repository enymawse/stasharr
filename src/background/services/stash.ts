import {
  MESSAGE_TYPES,
  type ExtensionRequest,
  type StashFindSceneByStashdbIdResponse,
  type ValidateConnectionResponse,
} from '../../shared/messages.js';
import {
  buildStashSceneUrl,
  getNormalizedStashBaseUrl,
  stashGraphqlRequest,
} from '../stash/graphql.js';

export async function handleValidateStashConnection(
  request: ExtensionRequest,
): Promise<ValidateConnectionResponse> {
  if (request.type !== MESSAGE_TYPES.validateConnection) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: 'Invalid request type.',
    };
  }

  const query = `
      query StasharrSystemStatus {
        systemStatus {
          status
        }
      }
    `;
  const result = await stashGraphqlRequest<{
    systemStatus?: { status?: string };
  }>(query);
  if (!result.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      status: result.error.status,
      error: result.error.message,
      data: result.error.details,
    };
  }

  if (!result.data?.systemStatus) {
    return {
      ok: false,
      type: MESSAGE_TYPES.validateConnection,
      error: 'Unexpected response payload.',
    };
  }

  return {
    ok: true,
    type: MESSAGE_TYPES.validateConnection,
    data: result.data,
  };
}

export async function handleStashFindSceneByStashdbId(
  request: ExtensionRequest,
): Promise<StashFindSceneByStashdbIdResponse> {
  if (request.type !== MESSAGE_TYPES.stashFindSceneByStashdbId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
      error: 'Invalid request type.',
    };
  }

  const stashdbSceneId = request.stashdbSceneId?.trim();
  if (!stashdbSceneId) {
    return {
      ok: false,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
      error: 'Scene ID is required.',
    };
  }

  const query = `
      query StasharrFindSceneByStashId($stashId: String!) {
        findScenes(
          scene_filter: {
            stash_id_endpoint: { stash_id: $stashId, modifier: EQUALS }
          }
          filter: { per_page: 1 }
        ) {
          scenes {
            id
            title
          }
        }
      }
    `;
  const result = await stashGraphqlRequest<{
    findScenes?: { scenes?: Array<{ id?: string; title?: string }> };
  }>(query, { stashId: stashdbSceneId });
  if (!result.ok) {
    return {
      ok: false,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
      error: result.error.message,
    };
  }

  const scenes = result.data?.findScenes?.scenes ?? [];
  const scene = scenes.find((item) => item?.id);

  if (!scene?.id) {
    return {
      ok: true,
      type: MESSAGE_TYPES.stashFindSceneByStashdbId,
      found: false,
    };
  }

  const normalized = await getNormalizedStashBaseUrl();
  const stashSceneUrl =
    normalized.ok && normalized.value
      ? buildStashSceneUrl(normalized.value, scene.id ?? stashdbSceneId)
      : undefined;

  return {
    ok: true,
    type: MESSAGE_TYPES.stashFindSceneByStashdbId,
    found: true,
    stashSceneId: scene.id,
    title: scene.title,
    stashSceneUrl,
  };
}
