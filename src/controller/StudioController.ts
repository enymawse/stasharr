import { icon } from "@fortawesome/fontawesome-svg-core";
import { Config } from "../models/Config";
import WhisparrService from "../service/WhisparrService";
import { Whisparr } from "../types/whisparr";
import {
  faBookmark as faBookmarkSolid,
  faExclamationTriangle,
  faPlusCircle,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { faBookmark as faBookmarkEmpty } from "@fortawesome/free-regular-svg-icons";
import {
  addTooltip,
  extractStashIdFromPath,
  removeTooltip,
  responseStatusCodeOK,
} from "../util/util";
import { StashDB } from "../enums/StashDB";
import { Stasharr } from "../enums/Stasharr";
import { includes, isNull } from "lodash";
import StudioService from "../service/StudioService";
import ToastService from "../service/ToastService";
import { Styles } from "../enums/Styles";

export class StudioController {
  static initialize(config: Config) {
    const studioStashId = extractStashIdFromPath();
    if (config.whisparrApiKey == "" || studioStashId == null) return;

    const studioTitleH3: HTMLElement | null =
      document.querySelector<HTMLElement>(
        StashDB.DOMSelector.StudioTitle + " > h3",
      );

    if (studioTitleH3) {
      const studioMonitorButton = document.querySelector<HTMLElement>(
        Stasharr.DOMSelector.StudioMonitor,
      );
      if (isNull(studioMonitorButton)) {
        StudioService.getStudioByStashId(config, studioStashId).then(
          (studioDetails) => {
            if (studioDetails) {
              studioTitleH3.append(
                StudioController.initMonitorButton(config, studioDetails),
              );
            } else {
              const studioName =
                studioTitleH3.querySelector<HTMLSpanElement>("span")?.innerText;
              studioTitleH3.append(
                StudioController.initAddStudioButton(
                  config,
                  studioStashId,
                  studioName || "studio",
                ),
              );
            }
          },
        );
      }
    }
  }
  static initAddStudioButton(
    config: Config,
    studioStashId: string,
    name: string,
  ): string | Node {
    const button = document.createElement("button");
    button.id = Stasharr.ID.StudioAdd;
    button.type = "button";
    button.classList.add("FavoriteStar", "ps-2", "btn", "btn-link");
    button.innerHTML = `${icon(faPlusCircle).html}`;
    button.style.cssText = Styles.AddStudioButton.style;
    addTooltip(button, `Add ${name} to Whisparr`);
    button.addEventListener("click", () => {
      StudioController.addStudio(config, button, studioStashId, name);
    });
    return button;
  }

  private static addStudio(
    config: Config,
    addStudioButton: HTMLButtonElement,
    stashId: string,
    name: string,
  ): void {
    StudioController.updateAddStudioButtonToLoading(addStudioButton);
    StudioService.addStudio(config, stashId).then((response) => {
      if (!responseStatusCodeOK(response.status)) {
        ToastService.showToast(
          "An error occurred while adding the studio to Whisparr.",
          false,
        );
        console.error(response.response);
        addStudioButton.innerHTML = `${icon(faExclamationTriangle).html}`;
        return;
      }
      ToastService.showToast(`Successfully added ${name} to Whisparr`, true);
      removeTooltip(addStudioButton);
      addStudioButton.remove();
      StudioController.initialize(config);
    });
  }

  private static updateAddStudioButtonToLoading(
    button: HTMLButtonElement,
  ): void {
    button.innerHTML = `${icon(faSpinner, { classes: ["fa-spin"] }).html}`;
    button.style.cssText = Styles.AddStudioButtonLoading.style;
    button.disabled = true;
  }

  private static initMonitorButton(
    config: Config,
    studio: Whisparr.WhisparrStudio,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = Stasharr.ID.StudioMonitor;
    button.type = "button";
    button.classList.add("FavoriteStar", "ps-2", "btn", "btn-link");
    StudioController.updateMonitorButton(button, studio);
    button.addEventListener("click", () => {
      StudioController.toggleMonitor(config, button, studio);
    });
    return button;
  }

  static updateMonitorButton(
    button: HTMLButtonElement,
    studio: Whisparr.WhisparrStudio,
  ): void {
    if (studio.monitored) {
      button.innerHTML = `${icon(faBookmarkSolid).html}`;
      addTooltip(button, `Unmonitor ${studio.title} in Whisparr`);
    } else {
      button.innerHTML = `${icon(faBookmarkEmpty).html}`;
      addTooltip(button, `Monitor ${studio.title} in Whisparr`);
    }
  }

  static toggleMonitor(
    config: Config,
    button: HTMLButtonElement,
    studio: Whisparr.WhisparrStudio,
  ): void {
    studio.monitored = !studio.monitored;
    StudioService.updateStudio(config, studio).then((updatedStudio) => {
      StudioController.updateMonitorButton(button, updatedStudio);
      if (updatedStudio.monitored) {
        ToastService.showToast(
          `Monitoring ${updatedStudio.title} in Whisparr`,
          true,
        );
      } else {
        ToastService.showToast(
          `Unmonitoring ${updatedStudio.title} in Whisparr`,
          true,
        );
      }
    });
  }
}
