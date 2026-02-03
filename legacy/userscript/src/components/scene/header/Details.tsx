import { createMemo, createResource, Show } from 'solid-js';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { filesize } from 'filesize';
import { Stasharr } from '../../../enums/Stasharr';
import SceneService from '../../../service/SceneService';
import WhisparrService from '../../../service/WhisparrService';
import { Config } from '../../../models/Config';
import StashSceneService from '../../../service/stash/StashSceneService';
import ExternalLink from '../../common/ExternalLink';
import { Badge } from 'solid-bootstrap';

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
    <>
      <Show when={sceneDetails() && qualityProfiles()}>
        <span>
          {sceneDetails()!.sizeOnDisk > 0
            ? filesize(sceneDetails()!.sizeOnDisk)
            : 'N/A'}
        </span>
        <span class="mx-1">•</span>
        <span>
          {
            qualityProfiles()!.find(
              (item) => item.id === sceneDetails()!.qualityProfileId,
            )?.name
          }
        </span>
        <div
          id={Stasharr.ID.SceneDetails}
          class="scene-details-badge-container"
        >
          <Show when={stashSceneDetails()}>
            <Badge pill bg="primary">
              <ExternalLink href={stashLink()} config={props.config}>
                Stash
              </ExternalLink>
            </Badge>
          </Show>
          <Badge pill bg="whisparr">
            <ExternalLink href={whisparrLink} config={props.config}>
              Whisparr
            </ExternalLink>
          </Badge>
        </div>
      </Show>
    </>
  );
};

export default Details;
