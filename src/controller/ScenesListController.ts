import { icon } from "@fortawesome/fontawesome-svg-core";
import { Styles } from "../enums/Styles";
import { Config } from "../models/Config";
import {
  faDownload,
  faPlus,
  faSearch,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { Stasharr } from "../enums/Stasharr";
import { SceneStatus } from "../enums/SceneStatus";
import { addTooltip, extractStashIdFromSceneCard } from "../util/util";
import ToastService from "../service/ToastService";
import { StashDB } from "../enums/StashDB";
import { parseInt } from "lodash";
import SceneService from "../service/SceneService";
import { ButtonController } from "./ButtonController";
import { StashIdToSceneCardAndStatusMap } from "../types/stasharr";

export class ScenesListController {
  static initialize(config: Config) {
    if (config.whisparrApiKey) {
      const sceneListCommandRow = document.querySelector<HTMLDivElement>(
        ".scenes-list > div.flex-wrap",
      );
      const addAllAvailableButton = document.querySelector(
        Stasharr.DOMSelector.AddAllAvailable,
      );

      const searchAllAvailableButton = document.querySelector(
        Stasharr.DOMSelector.SearchAllExisting,
      );
      if (sceneListCommandRow) {
        if (!addAllAvailableButton) {
          sceneListCommandRow.insertBefore(
            ScenesListController.createAddAllAvaiableButton(config),
            sceneListCommandRow.lastChild,
          );
        }
        if (!searchAllAvailableButton) {
          sceneListCommandRow.insertBefore(
            ScenesListController.createSearchAllExistingButton(config),
            sceneListCommandRow.lastChild,
          );
        }
      }
    }
  }

  private static createAddAllAvaiableButton(config: Config): HTMLDivElement {
    const customDiv = document.createElement("div");
    customDiv.classList.add("ms-3", "mb-2");

    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = Styles.SearchAllAvailable.style;
    button.id = Stasharr.ID.AddAllAvailable;
    button.innerHTML = `${icon(faDownload).html} Add All`;
    addTooltip(button, "Add all available scenes on this page to Whisparr.");

    button.addEventListener("click", () => {
      ScenesListController.handleAllAvailableButtonClick(
        button,
        config,
        SceneStatus.NOT_IN_WHISPARR,
      );
    });

    customDiv.appendChild(button);
    return customDiv;
  }

  private static createSearchAllExistingButton(config: Config): HTMLDivElement {
    const customDiv = document.createElement("div");
    customDiv.classList.add("ms-3", "mb-2");

    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = Styles.SearchAllExisting.style;
    button.id = Stasharr.ID.SearchAllExisting;
    button.innerHTML = `${icon(faSearch).html} Search All`;
    addTooltip(button, "Search all available scenes on this page in Whisparr.");

    button.addEventListener("click", () => {
      ScenesListController.handleAllAvailableButtonClick(
        button,
        config,
        SceneStatus.EXISTS_AND_NO_FILE,
      );
    });

    customDiv.appendChild(button);
    return customDiv;
  }

  private static handleAllAvailableButtonClick(
    button: HTMLButtonElement,
    config: Config,
    status: SceneStatus,
  ): void {
    ScenesListController.setLoadingState(button);
    let pageNumber: number = parseInt(
      document
        .querySelector<HTMLElement>(StashDB.DOMSelector.DataPage)
        ?.getAttribute(StashDB.DataAttribute.DataPage) || "{Page not found}",
    );
    let stashIdtoSceneCardAndStatusMap: StashIdToSceneCardAndStatusMap =
      new Map();
    let sceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(status),
    );
    sceneCards.forEach((node) => {
      const stashId = extractStashIdFromSceneCard(node);
      if (stashId) {
        stashIdtoSceneCardAndStatusMap.set(stashId, {
          status: null,
          sceneCard: node,
        });
      }
    });
    if (status === SceneStatus.EXISTS_AND_NO_FILE) {
      SceneService.triggerWhisparrSearchAll(
        config,
        Array.from(stashIdtoSceneCardAndStatusMap.keys()),
      ).then(() => {
        ToastService.showToast(
          `Triggered search for all ${stashIdtoSceneCardAndStatusMap.size} existing scenes on page ${pageNumber + 1}.`,
          true,
        );
        ScenesListController.updateSearchAllAvailableButton(button);
      });
    } else if (status === SceneStatus.NOT_IN_WHISPARR) {
      SceneService.lookupAndAddAll(config, stashIdtoSceneCardAndStatusMap).then(
        (sceneMap) => {
          ToastService.showToast(
            `Added ${sceneMap.size} new scenes to Whisparr from page ${pageNumber + 1}.`,
            true,
          );
          ScenesListController.updateButtonsForExistingScenes(sceneMap);
          ScenesListController.updateAddAllAvailableButton(button);
        },
      );
    }
  }

  private static updateAddAllAvailableButton(button: HTMLButtonElement): void {
    setTimeout(() => {
      button.style.cssText = Styles.SearchAllAvailable.style;
      button.innerHTML = `${icon(faDownload).html} Add All`;
      button.disabled = false;
    }, 200);
  }

  private static updateSearchAllAvailableButton(
    button: HTMLButtonElement,
  ): void {
    setTimeout(() => {
      button.style.cssText = Styles.SearchAllExisting.style;
      button.innerHTML = `${icon(faSearch).html} Search All`;
      button.disabled = false;
    }, 200);
  }

  private static setLoadingState(button: HTMLButtonElement): void {
    button.disabled = true;
    button.style.backgroundColor = Styles.Color.GRAY;
    button.innerHTML = `${icon(faSpinner, { classes: ["fa-spin"] }).html} Loading`;
  }

  private static updateButtonsForExistingScenes(
    sceneMap: StashIdToSceneCardAndStatusMap,
  ) {
    sceneMap.forEach((sceneMapObject) => {
      let button = sceneMapObject.sceneCard.querySelector<HTMLButtonElement>(
        Stasharr.DOMSelector.CardButton,
      );
      if (button && sceneMapObject.status) {
        ButtonController.updateButtonForExistingScene(
          button,
          false,
          sceneMapObject.status,
        );
      }
    });
  }
}
