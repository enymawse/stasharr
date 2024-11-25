import { createResource, Show } from 'solid-js';
import { Stasharr } from '../../enums/Stasharr';
import { Config } from '../../models/Config';
import SceneService from '../../service/SceneService';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { filesize } from 'filesize';
import WhisparrService from '../../service/WhisparrService';

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
      return WhisparrService.getQualityProfiles(p.config);
    },
  );

  const whisparrLink = `${props.config.whisparrUrl()}/movie/${props.stashId}`;

  return (
    <Show when={sceneDetails() && qualityProfiles()}>
      <div id={Stasharr.ID.HeaderDetails} style={'text-align: right'}>
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
