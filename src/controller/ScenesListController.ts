import { icon } from "@fortawesome/fontawesome-svg-core";
import { Styles } from "../enums/Styles";
import { Config } from "../models/Config";
import { faPlus, faSearch } from "@fortawesome/free-solid-svg-icons";
import { Stasharr } from "../enums/Stasharr";
import { SceneStatus } from "../enums/SceneStatus";
import { addTooltip, extractStashIdFromSceneCard } from "../util/util";
import ToastService from "../service/ToastService";
import { StashDB } from "../enums/StashDB";
import { parseInt } from "lodash";
import SceneService from "../service/SceneService";
import { ButtonController } from "./ButtonController";

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
      if (sceneListCommandRow && !addAllAvailableButton) {
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
    button.innerHTML = `${icon(faPlus).html}`;
    addTooltip(button, "Add all available scenes on this page to Whisparr.");

    button.addEventListener("click", () => {
      ScenesListController.handleAllAvailableButtonClick(
        config,
        SceneStatus.NEW,
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
    button.innerHTML = `${icon(faSearch).html}`;
    addTooltip(button, "Search all available scenes on this page in Whisparr.");

    button.addEventListener("click", () => {
      ScenesListController.handleAllAvailableButtonClick(
        config,
        SceneStatus.EXISTS,
      );
    });

    customDiv.appendChild(button);
    return customDiv;
  }

  // TODO: This code is a mess. Needs to be refactored for readability
  private static handleAllAvailableButtonClick(
    config: Config,
    status: SceneStatus,
  ): void {
    let pageNumber: number = parseInt(
      document
        .querySelector<HTMLElement>(StashDB.DOMSelector.DataPage)
        ?.getAttribute(StashDB.DataAttribute.DataPage) || "{Page not found}",
    );
    let stashIds: string[] = [];
    let complexObject: Map<
      string,
      { status: SceneStatus | null; sceneCard: HTMLElement }
    > = new Map();
    let sceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(status),
    );
    sceneCards.forEach((node) => {
      const stashId = extractStashIdFromSceneCard(node);
      if (stashId) {
        complexObject.set(stashId, { status: null, sceneCard: node });
        stashIds.push(stashId);
      }
    });
    if (status === SceneStatus.EXISTS) {
      SceneService.triggerWhisparrSearchAll(config, stashIds).then(() => {
        ToastService.showToast(
          `Triggered search for all ${stashIds.length} existing scenes on page ${pageNumber + 1}.`,
          true,
        );
      });
    } else if (status === SceneStatus.NEW) {
      SceneService.lookupAndAddAll(config, complexObject).then((sceneMap) => {
        ToastService.showToast(
          `Added ${sceneMap.size} new scenes to Whisparr from page ${pageNumber + 1}.`,
          true,
        );
        // reinit
        sceneMap.forEach((sceneMapObject) => {
          let button =
            sceneMapObject.sceneCard.querySelector<HTMLButtonElement>(
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
      });
    }
  }
}
