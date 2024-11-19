import { icon } from '@fortawesome/fontawesome-svg-core';
import { createMemo, createResource, Match, Suspense, Switch } from 'solid-js';
import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { getButtonDetails, clickHandler } from '../util/button';
import { fetchSceneStatus } from '../util/util';
import LoadingButton from './LoadingButton';

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
              id={
                props.header ? Stasharr.ID.HeaderButton : Stasharr.ID.CardButton
              }
              data-stasharr-scenestatus={sceneStatus()}
              onClick={() =>
                clickHandler(
                  sceneStatus(),
                  props.config,
                  props.stashId,
                  refetchStatus,
                )
              }
            >
              <span innerHTML={icon(buttonDetails().icon).html[0]}></span>
              {props.header ? ' ' + buttonDetails().text : ''}
            </button>
          </Match>
        </Switch>
      </Suspense>
    </>
  );
}

export default SceneButton;
