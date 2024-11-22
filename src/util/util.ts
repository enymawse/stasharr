import { SceneStatus, SceneStatusType } from '../enums/SceneStatus';
import { StashDB } from '../enums/StashDB';
import { Tooltip } from 'bootstrap';
import { Styles } from '../enums/Styles';
import {
  faCircleCheck,
  faDownload,
  faSearch,
  faVideoSlash,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { Config } from '../models/Config';
import SceneService from '../service/SceneService';
import { StashIdToSceneCardAndStatusMap } from '../types/stasharr';
import { render } from 'solid-js/web';
import SceneButton from '../components/SceneButton';

export const ObserverConfig = { childList: true, subtree: true };

export function extractStashIdFromSceneCard(sceneCard?: HTMLElement) {
  if (sceneCard) {
    const sceneUrl = sceneCard.querySelector('a')?.href;
    return sceneUrl?.split('/scenes/')[1];
  } else {
    return window.location.pathname.split('/')[2];
  }
}

export const isValidUUID = (str: string) =>
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/.test(
    str,
  );

export function extractStashIdFromPath(): string | null {
  const path = window.location.pathname;
  const pathComponents = path.split('/');
  let stashId: string | null = null;
  pathComponents.forEach((component) => {
    if (isValidUUID(component)) {
      stashId = component;
      return;
    }
  });
  return stashId;
}

export function shouldButtonsInit(node: HTMLElement): boolean {
  if (
    node.matches(
      StashDB.DOMSelector.SceneCard +
        ', ' +
        StashDB.DOMSelector.SceneInfoCardHeader,
    ) ||
    node.querySelector(
      StashDB.DOMSelector.SceneCard +
        ', ' +
        StashDB.DOMSelector.SceneInfoCardHeader,
    )
  ) {
    return true;
  }
  return false;
}

export function shouldStudioInit(node: HTMLElement): boolean {
  if (
    node.matches(StashDB.DOMSelector.StudioTitle) ||
    node.querySelector(StashDB.DOMSelector.StudioTitle)
  ) {
    return true;
  }
  return false;
}

export function shouldPerformerInit(node: HTMLElement): boolean {
  if (node.matches(StashDB.DOMSelector.PerformerInfo)) {
    return true;
  }
  return false;
}

export function shouldScenesListInit(node: HTMLElement): boolean {
  return node.matches('.row');
}

export function addTooltip(element: HTMLElement, tooltip: string): void {
  const existingTooltipInstance = Tooltip.getInstance(element);
  if (existingTooltipInstance) {
    existingTooltipInstance.setContent({ '.tooltip-inner': tooltip });
  } else {
    element.setAttribute('data-bs-toggle', 'tooltip');
    element.setAttribute('title', tooltip);
    new Tooltip(element);
  }
}

export function removeTooltip(element: HTMLElement): void {
  const existingTooltipInstance = Tooltip.getInstance(element);
  if (existingTooltipInstance) existingTooltipInstance.dispose();
}

export function responseStatusCodeOK(code: number) {
  return code < 300 && code >= 200;
}

export function stateByStatus(
  initialStatus: SceneStatusType,
): [boolean, string, IconDefinition] {
  let state = { disabled: false, color: Styles.Color.PINK, icon: faDownload };
  switch (initialStatus) {
    case SceneStatus.NOT_IN_WHISPARR:
      state.color = Styles.Color.PINK;
      state.icon = faDownload;
      break;
    case SceneStatus.EXCLUDED:
      state.color = Styles.Color.RED;
      state.icon = faVideoSlash;
      state.disabled = true;
      break;
    case SceneStatus.EXISTS_AND_HAS_FILE:
      state.color = Styles.Color.GREEN;
      state.icon = faCircleCheck;
      state.disabled = true;
      break;
    case SceneStatus.EXISTS_AND_NO_FILE:
      state.color = Styles.Color.YELLOW;
      state.icon = faSearch;
      break;
    default:
      break;
  }
  return [state.disabled, state.color, state.icon];
}

export const fetchSceneStatus = async (p: {
  config: Config;
  stashId: string;
}) => {
  const response = await SceneService.getSceneStatus(p.config, p.stashId);
  return response;
};

export const rehydrateSceneCards = async (
  config: Config,
  sceneMap: StashIdToSceneCardAndStatusMap,
) => {
  sceneMap.forEach((sceneMapItem, stashId) => {
    sceneMapItem.sceneCard.querySelector('.stasharr-card-button')?.remove();
    render(
      () => SceneButton({ config: config, stashId: stashId, header: false }),
      sceneMapItem.sceneCard,
    );
  });
};

export function tooltips() {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    const tooltip = Tooltip.getInstance(tooltipTriggerEl);
    if (tooltip) tooltip.dispose();
    new Tooltip(tooltipTriggerEl);
  });
}
