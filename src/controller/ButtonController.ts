import {
  faCircleCheck,
  faDownload,
  faSearch,
  faSpinner,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Config } from "../models/Config";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { extractStashIdFromSceneCard } from "../util/util";
import SceneService from "../service/SceneService";
import ToastService from "../service/ToastService";
import { SceneLookupStatus, SceneStatus } from "../enums/SceneStatus";
import { Styles } from "../enums/Styles";
import { Stasharr } from "../enums/Stasharr";
import { StashDB } from "../enums/StashDB";

export class ButtonController {
  static initializeButtons(config: Config) {
    if (config.whisparrApiKey == "") return;
    const sceneCards = document.querySelectorAll<HTMLElement>(
      StashDB.DOMSelector.SceneCard,
    );
    sceneCards.forEach(async (sceneCard) => {
      if (!sceneCard.querySelector(Stasharr.DOMSelector.CardButton)) {
        const button = ButtonController.createCardButton();
        sceneCard.appendChild(button);
        const stashId = extractStashIdFromSceneCard(sceneCard);
        if (stashId) {
          try {
            const status: SceneStatus = await SceneService.getSceneStatus(
              config,
              stashId,
            );
            ButtonController.updateButton(button, status);
            button.addEventListener("click", () =>
              ButtonController.handleButtonClick(config, stashId, button),
            );
          } catch (error) {
            ToastService.showToast(JSON.stringify(error), false);
            console.error(error);
          }
        }
      }
    });

    (async () => {
      const cardHeader: HTMLElement | null =
        document.querySelector<HTMLElement>(
          StashDB.DOMSelector.SceneInfoCardHeader,
        );

      if (
        cardHeader &&
        !document.querySelector(`#${Stasharr.ID.HeaderButton}`)
      ) {
        const isHeader = true;
        const triggerButton = ButtonController.createHeaderButton();
        cardHeader.appendChild(triggerButton);
        const sceneID = extractStashIdFromSceneCard();
        if (sceneID) {
          try {
            const status: SceneStatus = await SceneService.getSceneStatus(
              config,
              sceneID,
            );
            ButtonController.updateButton(triggerButton, status, isHeader);
            triggerButton.addEventListener("click", () => {
              ButtonController.handleButtonClick(
                config,
                sceneID,
                triggerButton,
                isHeader,
              );
            });
          } catch (error) {
            ToastService.showToast(JSON.stringify(error), false);
            console.log(error);
          }
        }
      }
    })();
  }

  private static updateButton(
    button: HTMLButtonElement,
    status: SceneStatus,
    isHeader: boolean = false,
  ) {
    switch (status) {
      case SceneStatus.EXISTS_AND_HAS_FILE:
        ButtonController.updateButtonForDownloadedScene(
          button,
          isHeader,
          status,
        );
        break;
      case SceneStatus.EXISTS_AND_NO_FILE:
        ButtonController.updateButtonForExistingScene(button, isHeader, status);
        break;
      case SceneStatus.NOT_IN_WHISPARR:
        ButtonController.updateButtonForNewScene(button, isHeader, status);
        break;
      default:
        break;
    }
  }

  static async handleButtonClick(
    config: Config,
    sceneID: string,
    button: HTMLButtonElement,
    isHeader: boolean = false,
  ) {
    ButtonController.setLoadingState(button, isHeader);
    try {
      const status: SceneStatus = await SceneService.getSceneStatus(
        config,
        sceneID,
      );
      if (status === SceneStatus.NOT_IN_WHISPARR) {
        const result = await SceneService.lookupAndAddScene(config, sceneID);
        if (result === SceneLookupStatus.ADDED) {
          ButtonController.updateButtonForExistingScene(
            button,
            isHeader,
            status,
          );
          ToastService.showToast("Scene added successfully!", true);
        } else {
          ButtonController.updateButtonForNewScene(button, isHeader, status);
          if (result === SceneLookupStatus.NOT_FOUND) {
            ToastService.showToast("Scene not found!", false);
          } else {
            ToastService.showToast("Error adding Scene!", false);
          }
        }
      } else if (status === SceneStatus.EXISTS_AND_NO_FILE) {
        const result = await SceneService.triggerWhisparrSearch(
          config,
          sceneID,
        );
        ButtonController.updateButtonForExistingScene(button, isHeader, status);
        if (result === SceneLookupStatus.ADDED) {
          ToastService.showToast("Searching for Scene", true);
        } else {
          if (result === SceneLookupStatus.NOT_FOUND) {
            ToastService.showToast("Scene not found!", false);
          } else {
            ToastService.showToast("Error Searching for Scene!", false);
          }
        }
      }
    } catch (error) {
      ToastService.showToast(JSON.stringify(error), false);
      console.log(JSON.stringify(error), error);
    }
  }

  private static createCardButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.style.cssText = Styles.CardButton.style;
    button.id = Stasharr.ID.CardButton;
    button.innerHTML = icon(faDownload).html[0]; // Icon only
    button.setAttribute(
      Stasharr.DataAttribute.SceneStatus,
      SceneStatus.NOT_IN_WHISPARR.toString(),
    );
    return button;
  }

  private static createHeaderButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = Stasharr.ID.HeaderButton;
    button.style.cssText = Styles.HeaderButton.style;
    button.innerHTML = icon(faDownload).html[0]; // Icon only
    return button;
  }

  private static setLoadingState(
    button: HTMLButtonElement,
    isHeader: boolean = false,
  ): void {
    button.disabled = true;
    button.style.backgroundColor = Styles.Color.GRAY;
    button.innerHTML = `${isHeader ? icon(faSpinner, { classes: ["fa-spin"] }).html : ""} Loading`;
  }

  // Update button states
  private static updateButtonForDownloadedScene(
    button: HTMLButtonElement,
    isHeader: boolean,
    status: SceneStatus,
  ): void {
    ButtonController.updateButtonState(
      button,
      faCircleCheck,
      "Download Complete",
      Styles.Color.GREEN,
      isHeader,
      status,
      true,
    );
  }

  public static updateButtonForExistingScene(
    button: HTMLButtonElement,
    isHeader: boolean,
    status: SceneStatus,
  ): void {
    ButtonController.updateButtonState(
      button,
      faSearch,
      "In Whisparr",
      Styles.Color.YELLOW,
      isHeader,
      status,
    );
  }

  private static updateButtonForNewScene(
    button: HTMLButtonElement,
    isHeader: boolean,
    status: SceneStatus,
  ): void {
    ButtonController.updateButtonState(
      button,
      faDownload,
      "Add to Whisparr",
      Styles.Color.PINK,
      isHeader,
      status,
    );
  }

  private static updateButtonState(
    button: HTMLButtonElement,
    iconType: IconDefinition,
    text: string,
    backgroundColor: Styles.Color,
    isHeader: boolean,
    status: SceneStatus,
    disable: boolean = false,
  ): void {
    button.disabled = disable;
    button.style.color =
      backgroundColor === Styles.Color.YELLOW
        ? Styles.Color.BLACK
        : Styles.Color.WHITE;
    button.style.backgroundColor = backgroundColor;
    button.innerHTML = `${icon(iconType).html}${isHeader ? " " + text : ""}`;
    button.removeAttribute(Stasharr.DataAttribute.SceneStatus);
    button.setAttribute(Stasharr.DataAttribute.SceneStatus, status.toString());
  }
}
