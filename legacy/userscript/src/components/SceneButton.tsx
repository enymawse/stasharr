import {
  createMemo,
  createResource,
  createEffect,
  Match,
  Suspense,
  Switch,
} from 'solid-js';
import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { getButtonDetails, clickHandler } from '../util/button';
import { fetchWhisparrSceneAndStatus } from '../util/util';
import LoadingButton from './LoadingButton';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCircleCheck,
  faDownload,
  faSearch,
  faVideoSlash,
} from '@fortawesome/free-solid-svg-icons';
import { SceneButtonRefreshService } from '../service/SceneButtonRefreshService';

library.add(faDownload, faCircleCheck, faSearch, faVideoSlash);

function SceneButton(props: {
  config: Config;
  stashId: string;
  header: boolean;
}) {
  const [whisparrSceneAndStatus, { refetch: refreshWhisparrSceneAndStatus }] =
    createResource(props, fetchWhisparrSceneAndStatus);

  // Subscribe to global refresh events
  const refreshSignal = SceneButtonRefreshService.getRefreshSignal();
  createEffect(() => {
    refreshSignal(); // Subscribe to the signal
    refreshWhisparrSceneAndStatus(); // Refetch when signal changes
  });

  const buttonDetails = createMemo(() =>
    getButtonDetails(whisparrSceneAndStatus(), props.header),
  );

  return (
    <>
      <Suspense fallback={<LoadingButton header={props.header} />}>
        <Switch>
          <Match when={whisparrSceneAndStatus.error}>
            <span>Error: {whisparrSceneAndStatus.error}</span>
          </Match>
          <Match when={whisparrSceneAndStatus() !== undefined}>
            <button
              class={buttonDetails().class}
              disabled={buttonDetails().disabled}
              id={props.header ? Stasharr.ID.HeaderButton : undefined}
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
              {props.header ? ' ' + buttonDetails().text : ''}
            </button>
          </Match>
        </Switch>
      </Suspense>
    </>
  );
}

export default SceneButton;
