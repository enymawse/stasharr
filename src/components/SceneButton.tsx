import { icon } from '@fortawesome/fontawesome-svg-core';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import {
  createEffect,
  createMemo,
  createResource,
  Match,
  Show,
  Switch,
} from 'solid-js';
import { Config } from '../models/Config';
import { Stasharr } from '../enums/Stasharr';
import { getButtonDetails, clickHandler } from '../util/button';
import { fetchSceneStatus } from '../util/util';

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
      <Show when={sceneStatus.loading}>
        <span
          innerHTML={icon(faSpinner, { classes: ['fa-spin'] }).html[0]}
        ></span>
        Loading
      </Show>
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
    </>
  );
}

export default SceneButton;
