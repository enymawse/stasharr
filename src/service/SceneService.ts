import { CommandPayloadBuilder } from '../builder/CommandPayloadBuilder';
import { ScenePayloadBuilder } from '../builder/ScenePayloadBuilder';
import { SceneSearchCommandStatus } from '../enums/SceneSearchCommandStatus';
import {
  SceneLookupStatus,
  SceneStatus,
  SceneStatusType,
} from '../enums/SceneStatus';
import { Config } from '../models/Config';
import { StashIdToSceneCardAndStatusMap } from '../types/stasharr';
import { Whisparr } from '../types/whisparr';
import ExclusionListService from './ExclusionListService';
import ServiceBase from './ServiceBase';
import ToastService from './ToastService';
import WhisparrService from './WhisparrService';

export default class SceneService extends ServiceBase {
  /**
   * Retrieves scene information from Whisparr using the Stash ID.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {string} sceneID - The unique Stash ID of the scene to fetch.
   * @returns {Promise<Whisparr.WhisparrScene | null>} - A promise that
   * resolves with the Scene or null from the Whisparr API.
   */ static async getSceneByStashId(
    config: Config,
    sceneID: string,
  ): Promise<Whisparr.WhisparrScene | null> {
    const endpoint = `movie?stashId=${encodeURIComponent(sceneID)}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (e) {
      ToastService.showToast(
        'Error occurred while looking up the scene',
        false,
      );
      console.error('Error in getSceneByStashId', e);
      return null;
    }
    const data = await response.response;
    if (data?.length > 0) {
      return data[0] as Whisparr.WhisparrScene;
    } else {
      return null;
    }
  }

  /**
   * Looks up a scene by its Stash ID in the Whisparr API and determines its download status.
   * @param {Config} config - The configuration object with the API details.
   * @param {string} stashId - The unique identifier of the scene.
   * @returns {Promise<SceneStatus>} - The status of the scene (e.g., NEW, EXISTS, DOWNLOADED).
   */
  static async getSceneStatus(
    config: Config,
    stashId: string,
  ): Promise<SceneStatusType> {
    const exclusionMap = await ExclusionListService.getExclusionsMap(config);
    if (exclusionMap.size > 0) {
      if (exclusionMap.has(stashId)) return SceneStatus.EXCLUDED;
    }
    const scene = await SceneService.getSceneByStashId(config, stashId);
    if (scene) {
      return scene.hasFile
        ? SceneStatus.EXISTS_AND_HAS_FILE
        : SceneStatus.EXISTS_AND_NO_FILE;
    } else {
      return SceneStatus.NOT_IN_WHISPARR;
    }
  }

  /**
   * Provides a Scene from Whisparr and its SceneStatus
   */
  static async getSceneWithStatus(
    config: Config,
    stashId: string,
  ): Promise<{
    scene: Whisparr.WhisparrScene | null;
    status: SceneStatusType;
  }> {
    const exclusionMap = await ExclusionListService.getExclusionsMap(config);
    let status;
    if (exclusionMap.size > 0) {
      if (exclusionMap.has(stashId))
        return { scene: null, status: SceneStatus.EXCLUDED };
    }
    const scene = await SceneService.getSceneByStashId(config, stashId);
    if (scene) {
      status = scene.hasFile
        ? SceneStatus.EXISTS_AND_HAS_FILE
        : SceneStatus.EXISTS_AND_NO_FILE;
    } else {
      status = SceneStatus.NOT_IN_WHISPARR;
    }
    return { scene, status };
  }

  /**
   * Looks up a scene by its Stash ID in the Whisparr API. Will return the Scene if it
   * exists in the Whisparr instance otherwise will return null.
   * @param config The configuration object with API details and user preferences
   * @param stashId The unique identifier of the scene.
   * @returns {Promise<Whisparr.WhisparrScene | null>} - The scene object or null as provided
   * by the Whisparr API.
   */
  static async lookupSceneByStashId(
    config: Config,
    stashId: string,
  ): Promise<Whisparr.WhisparrScene | null> {
    const endpoint = `lookup/scene?term=stash:${encodeURIComponent(stashId)}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (e) {
      ToastService.showToast(
        'Error occurred while looking up the scene',
        false,
      );
      console.error('Error in lookupSceneByStashId', e);
      return null;
    }
    const data = (await response.response) as Whisparr.LookupSceneResponse[];
    if (data?.length > 0) {
      return data[0].movie as Whisparr.WhisparrScene;
    } else {
      return null;
    }
  }
  /**
   * Trigger Whisparr to search for a scene.
   *
   * @param {Config} config - The configuration object containing API details and user preferences.
   * @param {string} stashId - The unique identifier of the scene to search.
   * @returns {Promise<SceneSearchCommandStatus>} - A promise that resolves with the status of the scene (ADDED, NOT_FOUND, or ERROR).
   */
  static async triggerWhisparrSearch(
    config: Config,
    stashId: string,
  ): Promise<SceneSearchCommandStatus> {
    const scene: Whisparr.WhisparrScene | null =
      await SceneService.getSceneByStashId(config, stashId);
    if (scene) {
      let payload = new CommandPayloadBuilder()
        .setName('MoviesSearch')
        .setMovieIds([scene.id])
        .build();
      const moviesSearchCommandResponse = await WhisparrService.command(
        config,
        payload,
      );
      if (moviesSearchCommandResponse) {
        return SceneSearchCommandStatus.CREATED;
      }
    }
    return SceneSearchCommandStatus.ERROR;
  }

  /**
   * Trigger Whisparr to search for an array of scenes.
   * @param config The configuration object containing API details and user preferences.
   * @param stashIds An array of unique scene identifiers.
   */
  static async triggerWhisparrSearchAll(
    config: Config,
    stashIds: string[],
  ): Promise<void> {
    stashIds.forEach((stashId) => {
      SceneService.triggerWhisparrSearch(config, stashId);
    });
  }

  /**
   * Adds a scene to Whisparr by sending a POST request with the payload details to the underlying API.
   * @param {Config} config The configuration object containing API details and user preferences.
   * @param {Whisparr.WhisparrScene} scene The Scene object to add to Whisparr.
   * @returns {Promise<Whisparr.WhisparrScene | null>} The Scene object if it was successfully created in
   * Whisparr otherwise null.
   */
  static async addScene(
    config: Config,
    scene: Whisparr.WhisparrScene,
  ): Promise<Whisparr.WhisparrScene | null> {
    const endpoint = 'movie';
    const payload = new ScenePayloadBuilder()
      .setForeignId(scene.foreignId)
      .setMonitored(true)
      .setTitle(scene.title)
      .setQualityProfileId(config.qualityProfile)
      .setRootFolderPath(config.rootFolderPath)
      .setSearchForMovie(config.searchForNewMovie)
      .setTags(config.tags)
      .build();
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'POST', payload);
    } catch (e) {
      ToastService.showToast('Error occurred while adding the scene.', false);
      console.error('Error adding scene', e);
      return null;
    }
    const data = await response.response;
    if (data) {
      return data as Whisparr.WhisparrScene;
    } else {
      return null;
    }
  }

  /**
   * Looks up the Scene in Whisparr by its stashId and adds it to Whisparr if found.
   * @param config The configuration object containing API details and user preferences.
   * @param stashId The Scene's unique identifier.
   * @returns {Promise<SceneLookupStatus>} A promise that resolves with the status of the attempted
   * lookup and add operations.
   */
  static async lookupAndAddScene(
    config: Config,
    stashId: string,
  ): Promise<SceneLookupStatus> {
    let scene = await SceneService.lookupSceneByStashId(config, stashId).then(
      async (s) => {
        if (s) {
          return await SceneService.addScene(config, s);
        } else {
          return SceneLookupStatus.NOT_FOUND;
        }
      },
    );
    return scene ? SceneLookupStatus.ADDED : SceneLookupStatus.ERROR;
  }

  /**
   *
   * @param {Config} config The configuration object containing API details and user preferences.
   * @param {StashIdToSceneCardAndStatusMap} stashIdtoSceneCardAndStatusMap A map
   * of scene identifiers and their associated objects.
   * @returns {Promise<StashIdToSceneCardAndStatusMap>} A promise
   * that resolves to an updated map with scene statuses.
   */
  static async lookupAndAddAll(
    config: Config,
    stashIdtoSceneCardAndStatusMap: StashIdToSceneCardAndStatusMap,
  ): Promise<StashIdToSceneCardAndStatusMap> {
    const updatePromises = Array.from(
      stashIdtoSceneCardAndStatusMap.entries(),
    ).map(async ([key, obj]) => {
      const status: SceneLookupStatus = await SceneService.lookupAndAddScene(
        config,
        key,
      );
      obj.status = SceneLookupStatus.mapToSceneStatus(status);
    });

    await Promise.all(updatePromises);

    return stashIdtoSceneCardAndStatusMap;
  }
}
