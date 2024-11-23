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
import { fetchSceneStatus, tooltips } from '../util/util';
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
  const [sceneStatus, { refetch: refetchStatus }] = createResource(
    props,
    fetchSceneStatus,
  );

  const buttonDetails = createMemo(() =>
    getButtonDetails(sceneStatus(), props.header),
  );

  createEffect(() => {
    if (sceneStatus()) {
      tooltips();
    }
  });

  return (
    <>
      <Suspense fallback={<LoadingButton header={props.header} />}>
        <Switch>
          <Match when={sceneStatus.error}>
            <span>Error: {sceneStatus.error}</span>
          </Match>
          <Match when={sceneStatus() !== undefined}>
            <button
              class={buttonDetails().class}
              disabled={buttonDetails().disabled}
              id={props.header ? Stasharr.ID.HeaderButton : undefined}
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
              {props.header ? ' ' + buttonDetails().text : ''}
            </button>
          </Match>
        </Switch>
      </Suspense>
    </>
  );
}

export default SceneButton;
