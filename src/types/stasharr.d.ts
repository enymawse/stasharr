import { SceneStatus } from '../enums/SceneStatus';
import { Whisparr } from './whisparr';

/**
 * Represents a mapping of `stashId` strings to objects containing scene-related data.
 *
 * Each entry in this map uses a `stashId` (a unique identifier for a scene) as the key.
 * The value for each key is an object with the following properties:
 * - `status`: The current status of the scene, represented by `SceneStatus`.
 * - `sceneCard`: The `HTMLElement` representing the scene's card in the UI.
 *
 * ### Usage
 * This map is used to efficiently look up and update scene statuses and their associated
 * UI elements (e.g., scene cards) based on their unique `stashId`.
 *
 * @example
 * // Accessing the scene status and scene card
 * const sceneData = stashIdToSceneCardAndStatusMap.get("12345");
 * if (sceneData) {
 *   console.log(sceneData.status); // Logs the SceneStatus of the scene with stashId "12345"
 *   sceneData.sceneCard.querySelector<HTMLButtonElement>('#idselector');
 * }
 */
export type StashIdToSceneCardAndStatusMap = Map<
  string,
  { status: SceneStatus | null; sceneCard: HTMLElement }
>;

export type ExclusionsMap = Map<string, Whisparr.Exclusion>;
