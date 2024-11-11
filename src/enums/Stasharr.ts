import { SceneStatus } from "./SceneStatus";
import { StashDB } from "./StashDB";
import { getSelectorFromId } from "../util/util";

export namespace Stasharr {
  export enum DataAttribute {
    SceneStatus = "data-stasharr-scenestatus",
  }
  export enum ID {
    CardButton = "stasharr-button",
    PerformerAdd = "stasharr-performeradd",
    HeaderButton = "stasharr-header-button",
    AddAllAvailable = "stasharr-addallavailable",
    PerformerMonitor = "stasharr-performermonitor",
    SearchAllExisting = "stasharr-searchallavailable",
  }
  export class DOMSelector {
    static CardButton = getSelectorFromId(ID.CardButton);
    static PerformerAdd = getSelectorFromId(ID.PerformerAdd);
    static HeaderButton = getSelectorFromId(ID.HeaderButton);
    static AddAllAvailable = getSelectorFromId(ID.AddAllAvailable);
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
