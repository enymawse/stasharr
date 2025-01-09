import {
  createEffect,
  createMemo,
  createResource,
  Match,
  Suspense,
  Switch,
} from 'solid-js';
import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { getButtonDetails, clickHandler } from '../util/button';
import { fetchWhisparrSceneAndStatus, tooltips } from '../util/util';
import LoadingButton from './LoadingButton';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCircleCheck,
  faDownload,
  faSearch,
  faVideoSlash,
} from '@fortawesome/free-solid-svg-icons';

library.add(faDownload, faCircleCheck, faSearch, faVideoSlash);

function SceneButton(props: {
  config: Config;
  stashId: string;
  header: boolean;
}) {
  const [whisparrSceneAndStatus, { refetch: refreshWhisparrSceneAndStatus }] =
    createResource(props, fetchWhisparrSceneAndStatus);

  const buttonDetails = createMemo(() =>
    getButtonDetails(whisparrSceneAndStatus(), props.header),
  );

  createEffect(() => {
    if (whisparrSceneAndStatus()?.status) {
      tooltips();
    }
  });

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
