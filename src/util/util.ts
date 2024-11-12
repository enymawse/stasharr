import { faL } from "@fortawesome/free-solid-svg-icons";
import { StashDB } from "../enums/StashDB";
import { Tooltip } from "bootstrap";
import { Stasharr } from "../enums/Stasharr";
import { isNull } from "lodash";

export function extractStashIdFromSceneCard(sceneCard?: HTMLElement) {
  if (sceneCard) {
    const sceneUrl = sceneCard.querySelector("a")?.href;
    return sceneUrl?.split("/scenes/")[1];
  } else {
    return window.location.pathname.split("/")[2];
  }
}

export const isValidUUID = (str: string) =>
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/.test(
    str,
  );

export function extractStashIdFromPath(): string | null {
  const path = window.location.pathname;
  const pathComponents = path.split("/");
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
        ", " +
        StashDB.DOMSelector.SceneInfoCardHeader,
    ) ||
    node.querySelector(
      StashDB.DOMSelector.SceneCard +
        ", " +
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
  return node.matches(".row");
}

export function addTooltip(element: HTMLElement, tooltip: string): void {
  const existingTooltipInstance = Tooltip.getInstance(element);
  if (existingTooltipInstance) {
    existingTooltipInstance.setContent({ ".tooltip-inner": tooltip });
  } else {
    element.setAttribute("data-bs-toggle", "tooltip");
    element.setAttribute("title", tooltip);
    new Tooltip(element);
  }
}

export function removeTooltip(element: HTMLElement): void {
  const existingTooltipInstance = Tooltip.getInstance(element);
  if (existingTooltipInstance) existingTooltipInstance.dispose();
}

export function getSelectorFromId(id: Stasharr.ID): string {
  return `#${id}`;
}

export function responseStatusCodeOK(code: number) {
  return code < 300 && code >= 200;
}
