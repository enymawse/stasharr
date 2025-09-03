import { createMemo, createResource, Show, createSignal } from 'solid-js';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { filesize } from 'filesize';
import { Stasharr } from '../../../enums/Stasharr';
import SceneService from '../../../service/SceneService';
import WhisparrService from '../../../service/WhisparrService';
import { Config } from '../../../models/Config';
import StashSceneService from '../../../service/stash/StashSceneService';
import CopyButton from '../../CopyButton';
import ExternalLink from '../../common/ExternalLink';
import { SceneButtonRefreshService } from '../../../service/SceneButtonRefreshService';
import DeleteConfirmModal from '../../DeleteConfirmModal';

library.add(faArrowUpRightFromSquare, faTrashCan);

const Details = (props: { config: Config; stashId: string }) => {
  const [sceneDetails, { refetch: refetchSceneDetails }] = createResource(
    props,
    async (p: { config: Config; stashId: string }) => {
      return SceneService.getSceneByStashId(p.config, p.stashId);
    },
  );

  const [showDelete, setShowDelete] = createSignal(false);

  const [qualityProfiles] = createResource(
    props,
    async (p: { config: Config }) => {
      return WhisparrService.qualityProfiles(p.config);
    },
  );

  const [stashSceneDetails] = createResource(props, async (p) => {
    if (p.config.stashValid()) {
      return StashSceneService.getSceneByStashId(p.config, p.stashId);
    }
  });

  const whisparrLink = `${props.config.whisparrUrl()}/movie/${props.stashId}`;

  const stashLink = createMemo(() => {
    const sceneId = stashSceneDetails()?.id;
    return sceneId ? props.config.stashSceneUrl(sceneId) : '';
  });

  return (
    <Show when={sceneDetails() && qualityProfiles()}>
      <div id={Stasharr.ID.HeaderDetails} style={'text-align: right'}>
        <Show when={stashSceneDetails()}>
          <ExternalLink href={stashLink()} config={props.config}>
            <FontAwesomeIcon icon="fa-solid fa-arrow-up-right-from-square" />{' '}
            View in Stash
          </ExternalLink>
          <br />
        </Show>
        <ExternalLink href={whisparrLink} config={props.config}>
          <FontAwesomeIcon icon="fa-solid fa-arrow-up-right-from-square" /> View
          in Whisparr
        </ExternalLink>{' '}
        <button
          class="btn btn-link text-danger p-0 ms-2"
          type="button"
          id={Stasharr.ID.SceneDelete}
          data-bs-toggle="tooltip"
          data-bs-title={`Delete ${sceneDetails()!.title} from Whisparr`}
          onClick={() => setShowDelete(true)}
        >
          <FontAwesomeIcon icon="fa-solid fa-trash-can" />
        </button>
        <br />
        Size:{' '}
        {sceneDetails()!.sizeOnDisk > 0
          ? filesize(sceneDetails()!.sizeOnDisk)
          : 'N/A'}
        <br />
        Quality Profile:{' '}
        {
          qualityProfiles()!.find(
            (item) => item.id === sceneDetails()!.qualityProfileId,
          )?.name
        }
        <br />
        <div style="margin-top: 8px;">
          <CopyButton
            textToCopy={props.stashId}
            className="btn btn-sm btn-outline-primary"
            tooltip="Copy Stash ID to clipboard"
          />
        </div>
      </div>
      <DeleteConfirmModal
        type="scene"
        show={showDelete()}
        onClose={() => setShowDelete(false)}
        onDeleted={() => {
          // Refresh scene details to update UI
          refetchSceneDetails();
          // Notify scene cards/buttons to refresh their status
          SceneButtonRefreshService.triggerRefresh();
        }}
        config={props.config}
        stashId={props.stashId}
        whisparrScene={sceneDetails()!}
      />
    </Show>
  );
};

export default Details;
