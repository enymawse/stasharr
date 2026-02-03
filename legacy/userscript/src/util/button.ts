import {
  SceneStatus,
  SceneLookupStatus,
  SceneStatusType,
} from '../enums/SceneStatus';
import SceneService from '../service/SceneService';
import ToastService from '../service/ToastService';
import { SceneSearchCommandStatus } from '../enums/SceneSearchCommandStatus';
import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';

export const getButtonDetails = (
  whisparrSceneAndStatus:
    | {
        scene: Whisparr.WhisparrScene | null;
        status: SceneStatusType | undefined;
      }
    | undefined,
  header: boolean,
) => {
  let iconToUse = 'fa-solid ';
  let buttonText = 'Add to Whisparr';
  let buttonClass = header ? 'stasharr-button' : 'stasharr-card-button';
  let disabled = false;
  let tooltipText = '';
  if (whisparrSceneAndStatus !== undefined) {
    switch (whisparrSceneAndStatus.status) {
      case SceneStatus.EXISTS_AND_HAS_FILE:
        iconToUse += 'fa-circle-check';
        buttonText = 'Already Downloaded';
        buttonClass += ` ${buttonClass}-downloaded`;
        disabled = true;
        tooltipText = 'Scene downloaded already.';
        break;
      case SceneStatus.EXISTS_AND_NO_FILE:
        iconToUse += 'fa-search';
        buttonText = 'In Whisparr';
        buttonClass += ` ${buttonClass}-searchable`;
        if (!whisparrSceneAndStatus.scene?.monitored)
          buttonClass += ' unmonitored';
        tooltipText =
          'Scene exists but no file has been downloaded. Trigger Whisparr to search for this scene. Gray: unmonitored, Yellow: monitored';
        break;
      case SceneStatus.NOT_IN_WHISPARR:
        iconToUse += 'fa-download';
        buttonText = 'Add to Whisparr';
        buttonClass += ` ${buttonClass}-add`;
        tooltipText = 'Add this scene to Whisparr.';
        break;
      case SceneStatus.EXCLUDED:
        iconToUse += 'fa-video-slash';
        buttonText = 'Excluded';
        buttonClass += ` ${buttonClass}-excluded`;
        disabled = true;
        tooltipText = 'This scene is on your Exclusion List.';
        break;
    }
  }
  return {
    icon: iconToUse,
    text: buttonText,
    class: buttonClass,
    disabled: disabled,
    tooltip: tooltipText,
  };
};

export const disableButton = (sceneStatus: SceneStatusType | undefined) => {
  switch (sceneStatus) {
    case SceneStatus.EXISTS_AND_HAS_FILE:
    case SceneStatus.EXCLUDED:
      return true;
    case SceneStatus.EXISTS_AND_NO_FILE:
    case SceneStatus.NOT_IN_WHISPARR:
      return false;
  }
};

export const clickHandler = async (
  sceneStatus: SceneStatusType | undefined,
  config: Config,
  stashId: string,
  refetchStatus: () => void,
) => {
  if (sceneStatus === SceneStatus.NOT_IN_WHISPARR) {
    const result = await SceneService.lookupAndAddScene(config, stashId);
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
  } else if (sceneStatus === SceneStatus.EXISTS_AND_NO_FILE) {
    const result = await SceneService.triggerWhisparrSearch(config, stashId);
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
