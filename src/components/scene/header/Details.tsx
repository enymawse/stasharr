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
    return `${props.config.stashDomain}/scenes/${stashSceneDetails()?.id}`;
  });

  return (
    <Show when={sceneDetails() && qualityProfiles()}>
      <div id={Stasharr.ID.HeaderDetails} style={'text-align: right'}>
        <Show when={stashSceneDetails()}>
          <a href={stashLink()}>
            <FontAwesomeIcon icon="fa-solid fa-arrow-up-right-from-square" />{' '}
            View in Stash
          </a>
          <br />
        </Show>
        <a href={whisparrLink}>
          <FontAwesomeIcon icon="fa-solid fa-arrow-up-right-from-square" /> View
          in Whisparr
        </a>
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
      </div>
    </Show>
  );
};

export default Details;
