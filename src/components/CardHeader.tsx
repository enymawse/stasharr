import { icon } from '@fortawesome/fontawesome-svg-core';
import { Stasharr } from '../enums/Stasharr';
import { SceneLookupStatus, SceneStatus } from '../enums/SceneStatus';
import { Config } from '../models/Config';
import SceneService from '../service/SceneService';
import {
  faDownload,
  faSpinner,
  faCircleCheck,
  faSearch,
  faVideoSlash,
} from '@fortawesome/free-solid-svg-icons';
import { createResource, Match, Show, Switch } from 'solid-js';
import ToastService from '../service/ToastService';
import { SceneSearchCommandStatus } from '../enums/SceneSearchCommandStatus';

function CardHeader(props: { config: Config; stashId: string }) {
  const [sceneStatus, { refetch: refetchStatus }] = createResource(
    props,
    async (p) => {
      const response = await SceneService.getSceneStatus(p.config, p.stashId);
      return response;
    },
  );

  const getButtonDetails = () => {
    let iconToUse = faDownload;
    let buttonText = 'Add to Whisparr';
    let buttonClass = 'stasharr-button';
    switch (sceneStatus()) {
      case SceneStatus.EXISTS_AND_HAS_FILE:
        iconToUse = faCircleCheck;
        buttonText = 'Already Downloaded';
        buttonClass += ' stasharr-button-downloaded';
        break;
      case SceneStatus.EXISTS_AND_NO_FILE:
        iconToUse = faSearch;
        buttonText = 'In Whisparr';
        buttonClass += ' stasharr-button-searchable';
        break;
      case SceneStatus.NOT_IN_WHISPARR:
        iconToUse = faDownload;
        buttonText = 'Add to Whisparr';
        buttonClass += ' stasharr-button-add';
        break;
      case SceneStatus.EXCLUDED:
        iconToUse = faVideoSlash;
        buttonText = 'Excluded';
        buttonClass += ' stasharr-button-excluded';
        break;
    }

    return { icon: iconToUse, text: buttonText, class: buttonClass };
  };

  const disableButton = () => {
    switch (sceneStatus()) {
      case SceneStatus.EXISTS_AND_HAS_FILE:
      case SceneStatus.EXCLUDED:
        return true;
      case SceneStatus.EXISTS_AND_NO_FILE:
      case SceneStatus.NOT_IN_WHISPARR:
        return false;
    }
  };

  const clickHandler = async () => {
    if (sceneStatus() === SceneStatus.NOT_IN_WHISPARR) {
      const result = await SceneService.lookupAndAddScene(
        props.config,
        props.stashId,
      );
      console.log(result);

      switch (result) {
        case SceneLookupStatus.ADDED:
          ToastService.showToast('Scene added successfully!', true);
          break;
        case SceneLookupStatus.NOT_FOUND:
          ToastService.showToast('Scene not found!', false);
          break;
        case SceneLookupStatus.ERROR:
          ToastService.showToast('Error adding Scene!', false);
      }
      refetchStatus();
    } else if (sceneStatus() === SceneStatus.EXISTS_AND_NO_FILE) {
      const result = await SceneService.triggerWhisparrSearch(
        props.config,
        props.stashId,
      );
      switch (result) {
        case SceneSearchCommandStatus.CREATED:
          ToastService.showToast('Searching for Scene', true);
          break;
        default:
          ToastService.showToast('Error Searching for Scene!', false);
          break;
      }
    }
  };

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
            class={getButtonDetails().class}
            disabled={disableButton()}
            id={Stasharr.ID.HeaderButton}
            data-stasharr-scenestatus={sceneStatus()}
            onClick={clickHandler}
          >
            <span innerHTML={icon(getButtonDetails().icon).html[0]}></span>{' '}
            {getButtonDetails().text}
          </button>
        </Match>
      </Switch>
    </>
  );
}

export default CardHeader;
