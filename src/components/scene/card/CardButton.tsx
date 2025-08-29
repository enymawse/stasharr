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
import { fetchWhisparrSceneAndStatus } from '../../../util/util';
import LoadingButton from '../../LoadingButton';
import { SceneStatus } from '../../../enums/SceneStatus';
import StashSceneService from '../../../service/stash/StashSceneService';
import ExternalLink from '../../common/ExternalLink';
import { SceneButtonRefreshService } from '../../../service/SceneButtonRefreshService';

const CardButton = (props: { config: Config; stashId: string }) => {
  const [whisparrSceneAndStatus, { refetch: refreshWhisparrSceneAndStatus }] =
    createResource(props, fetchWhisparrSceneAndStatus);

  // Subscribe to global refresh events
  const refreshSignal = SceneButtonRefreshService.getRefreshSignal();
  createEffect(() => {
    refreshSignal(); // Subscribe to the signal
    refreshWhisparrSceneAndStatus(); // Refetch when signal changes
  });

  const buttonDetails = createMemo(() =>
    getButtonDetails(whisparrSceneAndStatus(), false),
  );

  const inWhisparr = createMemo(() => {
    const v = [
      SceneStatus.EXISTS_AND_HAS_FILE,
      SceneStatus.EXISTS_AND_NO_FILE,
    ].find((val) => {
      return val === whisparrSceneAndStatus()?.status;
    });
    return v !== undefined;
  });

  const [stashSceneDetails] = createResource(props, async (p) => {
    if (p.config.stashValid()) {
      return StashSceneService.getSceneByStashId(p.config, p.stashId);
    }
  });

  const stashLink = createMemo(() => {
    const sceneId = stashSceneDetails()?.id;
    return sceneId ? props.config.stashSceneUrl(sceneId) : '';
  });

  return (
    <>
      <Suspense fallback={<LoadingButton header={false} />}>
        <Show when={inWhisparr()}>
          <ExternalLink
            class="whisparr-card-button"
            data-bs-toggle="tooltip"
            data-bs-title="View in Whisparr"
            href={`${props.config.whisparrUrl()}/movie/${props.stashId}`}
            config={props.config}
            showIndicator={false}
          >
            <i class="whisparrIcon"></i>
          </ExternalLink>
        </Show>
        <Show when={stashSceneDetails()}>
          <ExternalLink
            class="stash-card-button"
            data-bs-toggle="tooltip"
            data-bs-title="View in Stash"
            href={stashLink()}
            config={props.config}
            showIndicator={false}
          >
            <i class="stashIcon"></i>
          </ExternalLink>
        </Show>
        <Switch>
          <Match when={whisparrSceneAndStatus.error}>
            <span>Error: {whisparrSceneAndStatus.error}</span>
          </Match>
          <Match when={whisparrSceneAndStatus() !== undefined}>
            <button
              class={buttonDetails().class}
              disabled={buttonDetails().disabled}
              data-stasharr-scenestatus={whisparrSceneAndStatus()?.status}
              data-bs-toggle="tooltip"
              data-bs-title={buttonDetails().tooltip}
              onClick={() =>
                clickHandler(
                  whisparrSceneAndStatus()?.status,
                  props.config,
                  props.stashId,
                  refreshWhisparrSceneAndStatus,
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
