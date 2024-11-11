export namespace StashDB {
  export enum DataAttribute {
    DataPage = "data-page",
  }
  export enum DOMSelector {
    SceneCard = ".SceneCard",
    SceneInfoCardHeader = ".scene-info .card-header",
    PerformerCardHeader = ".card-header > h3",
    StudioTitle = ".studio-title",
    PerformerInfo = ".PerformerInfo",
    DataPage = `[${DataAttribute.DataPage}]`,
  }
  export enum Module {
    Performers = "performers",
    Studios = "studios",
    Scenes = "scenes",
  }
}
