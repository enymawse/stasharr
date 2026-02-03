export const SceneStatus = {
  EXISTS_AND_HAS_FILE: 0,
  EXISTS_AND_NO_FILE: 1,
  NOT_IN_WHISPARR: 2,
  EXCLUDED: 3,
} as const;

export type SceneStatusType = (typeof SceneStatus)[keyof typeof SceneStatus];

export class SceneLookupStatus {
  static readonly ADDED = new SceneLookupStatus(
    'ADDED',
    SceneStatus.EXISTS_AND_NO_FILE,
  );
  static readonly NOT_FOUND = new SceneLookupStatus(
    'NOT_FOUND',
    SceneStatus.NOT_IN_WHISPARR,
  );
  static readonly ERROR = new SceneLookupStatus(
    'ERROR',
    SceneStatus.NOT_IN_WHISPARR,
  );

  private constructor(
    public readonly name: string,
    public readonly mappedStatus: SceneStatusType,
  ) {}

  static mapToSceneStatus(status: SceneLookupStatus): SceneStatusType {
    return status.mappedStatus;
  }
}
