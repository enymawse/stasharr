import { createMemo, createResource, Show } from 'solid-js';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { filesize } from 'filesize';
import { Stasharr } from '../../../enums/Stasharr';
import SceneService from '../../../service/SceneService';
import WhisparrService from '../../../service/WhisparrService';
import { Config } from '../../../models/Config';
import StashSceneService from '../../../service/stash/StashSceneService';
import CopyButton from '../../CopyButton';
import ExternalLink from '../../common/ExternalLink';

library.add(faArrowUpRightFromSquare);

const Details = (props: { config: Config; stashId: string }) => {
  const [sceneDetails] = createResource(
    props,
    async (p: { config: Config; stashId: string }) => {
      return SceneService.getSceneByStashId(p.config, p.stashId);
    },
  );

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
        </ExternalLink>
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
    </Show>
  );
};

export default Details;
