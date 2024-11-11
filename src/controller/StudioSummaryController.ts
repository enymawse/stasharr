import { icon } from "@fortawesome/fontawesome-svg-core";
import { Config } from "../models/Config";
import WhisparrService from "../service/WhisparrService";
import { Whisparr } from "../types/types";
import { faBookmark as faBookmarkSolid } from "@fortawesome/free-solid-svg-icons";
import { faBookmark as faBookmarkReg } from "@fortawesome/free-regular-svg-icons";
import { addTooltip } from "../util/util";

export class StudioSummaryController {
  static initialize(config: Config) {
    if (config.whisparrApiKey == "") return;

    const studioTitle: HTMLElement | null =
      document.querySelector<HTMLElement>(".studio-title");

    const studioTitleH3: HTMLElement | null | undefined =
      studioTitle?.querySelector<HTMLElement>("h3");

    // Get the current path.
    // If the full URL is https://stashdb.org/studios/5ee16943-0da6-4ee4-94c1-54172e3d0b7e
    const path = window.location.pathname;

    const module = path.split("/")[1];
    const stashId = path.split("/")[2];

    if (
      module.toLowerCase() !== "studios" ||
      !stashId ||
      studioTitle === null ||
      studioTitleH3 === null
    ) {
      return;
    }

    (async () => {
      // Get the studio information
      const studio = await WhisparrService.handleStudioLookup(config, stashId);
      console.log(studio);
      if (studio) {
        const studioDetailsDiv =
          StudioSummaryController.createHeaderDetails(studio);
        studioTitle?.appendChild(studioDetailsDiv);
        studioTitleH3?.appendChild(
          StudioSummaryController.initializeMonitorButton(studio),
        );
      } else {
        console.log("Studio not in Whisparr");
      }
    })();
  }

  private static createHeaderDetails(
    studio: Whisparr.WhisparrStudio,
  ): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "whisparrStudioDetails";

    const divMonitored = document.createElement("div");
    divMonitored.innerText = `monitored: ${studio.monitored}`;
    div.appendChild(divMonitored);

    const divPath = document.createElement("div");
    divPath.innerText = `rootFolderPath: ${studio.rootFolderPath}`;
    div.appendChild(divPath);

    return div;
  }

  private static initializeMonitorButton(
    studio: Whisparr.WhisparrStudio,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = "whisparrStudioMonitored";
    button.type = "button";
    button.classList.add("FavoriteStar", "ps-2", "btn", "btn-link");
    button.innerHTML = `${icon(studio.monitored ? faBookmarkSolid : faBookmarkReg).html}`;
    addTooltip(button, "Monitor Studio in Whisparr");
    button.addEventListener("click", () => {
      console.log("toggle studio monitoring here");
    });
    return button;
  }
}
