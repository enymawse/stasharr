import { SceneStatus } from "./SceneStatus";
import { StashDB } from "./StashDB";
import { getSelectorFromId } from "../util/util";

export namespace Stasharr {
  export enum DataAttribute {
    SceneStatus = "data-stasharr-scenestatus",
  }
  export enum ID {
    CardButton = "stasharr-button",
    StudioAdd = "stasharr-studioadd",
    PerformerAdd = "stasharr-performeradd",
    HeaderButton = "stasharr-header-button",
    SettingsModal = "stasharr-settingsModal",
    AddAllAvailable = "stasharr-addallavailable",
    StudioMonitor = "stasharr-studiomonitor",
    PerformerMonitor = "stasharr-performermonitor",
    SearchAllExisting = "stasharr-searchallavailable",
  }
  export class DOMSelector {
    static CardButton = getSelectorFromId(ID.CardButton);
    static StudioAdd = getSelectorFromId(ID.StudioAdd);
    static SettingsModal = getSelectorFromId(ID.SettingsModal);
    static PerformerAdd = getSelectorFromId(ID.PerformerAdd);
    static HeaderButton = getSelectorFromId(ID.HeaderButton);
    static AddAllAvailable = getSelectorFromId(ID.AddAllAvailable);
    static StudioMonitor = getSelectorFromId(ID.StudioMonitor);
    static PerformerMonitor = getSelectorFromId(ID.PerformerMonitor);
    static SearchAllExisting = getSelectorFromId(ID.SearchAllExisting);
    static SceneCardByButtonStatus = (status: SceneStatus) => {
      return (
        `${StashDB.DOMSelector.SceneCard}:has([${DataAttribute.SceneStatus}=` +
        "'" +
        status +
        "'" +
        `])`
      );
    };
  }
}
