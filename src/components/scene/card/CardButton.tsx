import { FontAwesomeIcon } from 'solid-fontawesome';
import {
  createResource,
  createMemo,
  createEffect,
  Suspense,
  Switch,
  Match,
  Show,
} from 'solid-js';
import { Config } from '../../../models/Config';
import { getButtonDetails, clickHandler } from '../../../util/button';
import { fetchSceneStatus, tooltips } from '../../../util/util';
import LoadingButton from '../../LoadingButton';
import { SceneStatus } from '../../../enums/SceneStatus';
import StashSceneService from '../../../service/stash/StashSceneService';

const CardButton = (props: { config: Config; stashId: string }) => {
  const [sceneStatus, { refetch: refetchStatus }] = createResource(
    props,
    fetchSceneStatus,
  );

  const buttonDetails = createMemo(() =>
    getButtonDetails(sceneStatus(), false),
  );

  const inWhisparr = createMemo(() => {
    const v = [
      SceneStatus.EXISTS_AND_HAS_FILE,
      SceneStatus.EXISTS_AND_NO_FILE,
    ].find((val) => {
      return val === sceneStatus();
    });
    return v !== undefined;
  });

  const [stashSceneDetails] = createResource(props, async (p) => {
    if (p.config.stashValid()) {
      return StashSceneService.getSceneByStashId(p.config, p.stashId);
    }
  });

  const stashLink = createMemo(() => {
    return `${props.config.stashDomain}/scenes/${stashSceneDetails()?.id}`;
  });

  createEffect(() => {
    if (sceneStatus()) {
      tooltips();
    }
  });

  return (
    <>
      <Suspense fallback={<LoadingButton header={false} />}>
        <Show when={inWhisparr()}>
          <a
            class="whisparr-card-button"
            data-bs-toggle="tooltip"
            data-bs-title="View in Whisparr"
            href={`${props.config.whisparrUrl()}/movie/${props.stashId}`}
            target="_blank"
          >
            <i class="whisparrIcon"></i>
          </a>
        </Show>
        <Show when={stashSceneDetails()}>
          <a
            class="stash-card-button"
            data-bs-toggle="tooltip"
            data-bs-title="View in Stash"
            href={stashLink()}
            target="_blank"
          >
            <i class="stashIcon"></i>
          </a>
        </Show>
        <Switch>
          <Match when={sceneStatus.error}>
            <span>Error: {sceneStatus.error}</span>
          </Match>
          <Match when={sceneStatus() !== undefined}>
            <button
              class={buttonDetails().class}
              disabled={buttonDetails().disabled}
              data-stasharr-scenestatus={sceneStatus()}
              data-bs-toggle="tooltip"
              data-bs-title={buttonDetails().tooltip}
              onClick={() =>
                clickHandler(
                  sceneStatus(),
                  props.config,
                  props.stashId,
                  refetchStatus,
                )
              }
            >
              <FontAwesomeIcon icon={buttonDetails().icon} />
            </button>
          </Match>
        </Switch>
      </Suspense>
    </>
  );
};

export default CardButton;
