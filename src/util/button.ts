import {
  faDownload,
  faCircleCheck,
  faSearch,
  faVideoSlash,
} from '@fortawesome/free-solid-svg-icons';
import {
  SceneStatus,
  SceneLookupStatus,
  SceneStatusType,
} from '../enums/SceneStatus';
import SceneService from '../service/SceneService';
import ToastService from '../service/ToastService';
import { SceneSearchCommandStatus } from '../enums/SceneSearchCommandStatus';
import { Config } from '../models/Config';

export const getButtonDetails = (
  sceneStatus: SceneStatusType | undefined,
  header: boolean,
) => {
  let iconToUse = faDownload;
  let buttonText = 'Add to Whisparr';
  let buttonClass = header ? 'stasharr-button' : 'stasharr-card-button';
  let disabled = false;
  switch (sceneStatus) {
    case SceneStatus.EXISTS_AND_HAS_FILE:
      iconToUse = faCircleCheck;
      buttonText = 'Already Downloaded';
      buttonClass += ` ${buttonClass}-downloaded`;
      disabled = true;
      break;
    case SceneStatus.EXISTS_AND_NO_FILE:
      iconToUse = faSearch;
      buttonText = 'In Whisparr';
      buttonClass += ` ${buttonClass}-searchable`;
      break;
    case SceneStatus.NOT_IN_WHISPARR:
      iconToUse = faDownload;
      buttonText = 'Add to Whisparr';
      buttonClass += ` ${buttonClass}-add`;
      break;
    case SceneStatus.EXCLUDED:
      iconToUse = faVideoSlash;
      buttonText = 'Excluded';
      buttonClass += ` ${buttonClass}-excluded`;
      disabled = true;
      break;
  }
  return {
    icon: iconToUse,
    text: buttonText,
    class: buttonClass,
    disabled: disabled,
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
