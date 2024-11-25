import { library } from '@fortawesome/fontawesome-svg-core';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { Config } from '../../models/Config';
import { createMemo, createResource, Show } from 'solid-js';
import { fetchSceneStatus } from '../../util/util';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { SceneStatus } from '../../enums/SceneStatus';

library.add(faArrowUpRightFromSquare);

const WhisparrCardButton = (props: { config: Config; stashId: string }) => {
  const [sceneStatus] = createResource(props, fetchSceneStatus);

  const inWhisparr = createMemo(() => {
    const v = [
      SceneStatus.EXISTS_AND_HAS_FILE,
      SceneStatus.EXISTS_AND_NO_FILE,
    ].find((val) => {
      return val === sceneStatus();
    });
    return v !== undefined;
  });

  return (
    <>
      <Show when={inWhisparr()}>
        <a
          class="whisparr-card-button"
          data-bs-toggle="tooltip"
          data-bs-title="View in Whisparr"
          href={`${props.config.whisparrUrl()}/movie/${props.stashId}`}
          target="_blank"
        >
          <FontAwesomeIcon icon="fa-solid fa-arrow-up-right-from-square" />
        </a>
      </Show>
    </>
  );
};

export default WhisparrCardButton;
