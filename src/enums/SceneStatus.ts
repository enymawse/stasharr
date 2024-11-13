export enum SceneStatus {
  EXISTS_AND_HAS_FILE,
  EXISTS_AND_NO_FILE,
  NOT_IN_WHISPARR,
}

export class SceneLookupStatus {
  static readonly ADDED = new SceneLookupStatus(
    "ADDED",
    SceneStatus.EXISTS_AND_NO_FILE,
  );
  static readonly NOT_FOUND = new SceneLookupStatus(
    "NOT_FOUND",
    SceneStatus.NOT_IN_WHISPARR,
  );
  static readonly ERROR = new SceneLookupStatus(
    "ERROR",
    SceneStatus.NOT_IN_WHISPARR,
  );

  private constructor(
    public readonly name: string,
    public readonly mappedStatus: SceneStatus,
  ) {}

  static mapToSceneStatus(status: SceneLookupStatus): SceneStatus {
    return status.mappedStatus;
  }
}
