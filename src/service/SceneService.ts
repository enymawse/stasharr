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
import SceneComparisonService from './SceneComparisonService';
import { StashDBScene } from './StashDBService';
import { SceneButtonRefreshService } from './SceneButtonRefreshService';

interface ProgressTracker {
  updateItem: (
    id: string,
    status: 'pending' | 'processing' | 'success' | 'error',
    message?: string,
  ) => void;
  complete: () => void;
  addItems: (items: { id: string; name: string }[]) => void;
  removeItem: (itemId: string) => void;
  setSkippedInfo: (count: number, reason: string) => void;
}

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
    options?: { suppressToasts?: boolean },
  ): Promise<Whisparr.WhisparrScene | null> {
    const endpoint = `movie?stashId=${encodeURIComponent(sceneID)}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (e) {
      if (!options?.suppressToasts) {
        ToastService.showToast(
          'Error occurred while looking up the scene',
          false,
        );
      }
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
    options?: { suppressToasts?: boolean },
  ): Promise<Whisparr.WhisparrScene | null> {
    const endpoint = `lookup/scene?term=stash:${encodeURIComponent(stashId)}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (e) {
      if (!options?.suppressToasts) {
        ToastService.showToast(
          'Error occurred while looking up the scene',
          false,
        );
      }
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
    options?: { suppressToasts?: boolean },
  ): Promise<SceneSearchCommandStatus> {
    const scene: Whisparr.WhisparrScene | null =
      await SceneService.getSceneByStashId(config, stashId, {
        suppressToasts: options?.suppressToasts,
      });
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
   * @param progressTracker Optional progress tracker for bulk operations.
   */
  static async triggerWhisparrSearchAll(
    config: Config,
    stashIds: string[],
    progressTracker?: ProgressTracker,
  ): Promise<void> {
    for (const stashId of stashIds) {
      if (progressTracker) {
        progressTracker.updateItem(stashId, 'processing');
      }
      try {
        await SceneService.triggerWhisparrSearch(config, stashId, {
          suppressToasts: Boolean(progressTracker),
        });
        if (progressTracker) {
          progressTracker.updateItem(stashId, 'success');
        }
      } catch (error) {
        if (progressTracker) {
          progressTracker.updateItem(
            stashId,
            'error',
            `Failed to trigger search: ${error}`,
          );
        }
      }
    }
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
    options?: { suppressToasts?: boolean },
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
      if (!options?.suppressToasts) {
        ToastService.showToast('Error occurred while adding the scene.', false);
      }
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
    options?: { suppressToasts?: boolean },
  ): Promise<SceneLookupStatus> {
    let scene = await SceneService.lookupSceneByStashId(config, stashId, {
      suppressToasts: options?.suppressToasts,
    }).then(async (s) => {
      if (s) {
        return await SceneService.addScene(config, s, {
          suppressToasts: options?.suppressToasts,
        });
      } else {
        return SceneLookupStatus.NOT_FOUND;
      }
    });
    return scene ? SceneLookupStatus.ADDED : SceneLookupStatus.ERROR;
  }

  /**
   *
   * @param {Config} config The configuration object containing API details and user preferences.
   * @param {StashIdToSceneCardAndStatusMap} stashIdtoSceneCardAndStatusMap A map
   * of scene identifiers and their associated objects.
   * @param progressTracker Optional progress tracker for bulk operations.
   * @returns {Promise<StashIdToSceneCardAndStatusMap>} A promise
   * that resolves to an updated map with scene statuses.
   */
  static async lookupAndAddAll(
    config: Config,
    stashIdtoSceneCardAndStatusMap: StashIdToSceneCardAndStatusMap,
    progressTracker?: ProgressTracker,
  ): Promise<StashIdToSceneCardAndStatusMap> {
    const updatePromises = Array.from(
      stashIdtoSceneCardAndStatusMap.entries(),
    ).map(async ([key, obj]) => {
      if (progressTracker) {
        progressTracker.updateItem(key, 'processing');
      }
      try {
        const status: SceneLookupStatus = await SceneService.lookupAndAddScene(
          config,
          key,
          { suppressToasts: Boolean(progressTracker) },
        );
        obj.status = SceneLookupStatus.mapToSceneStatus(status);
        if (progressTracker) {
          progressTracker.updateItem(
            key,
            status === SceneLookupStatus.ADDED ? 'success' : 'error',
          );
        }
      } catch (error) {
        if (progressTracker) {
          progressTracker.updateItem(
            key,
            'error',
            `Failed to add scene: ${error}`,
          );
        }
      }
    });

    await Promise.all(updatePromises);

    return stashIdtoSceneCardAndStatusMap;
  }

  /**
   * Add missing scenes found through comprehensive StashDB/Whisparr comparison
   */
  static async addAllMissingScenes(
    config: Config,
    progressTracker?: ProgressTracker,
  ): Promise<{
    totalFound: number;
    totalAdded: number;
    failed: string[];
  }> {
    try {
      if (progressTracker) {
        progressTracker.updateItem('search', 'processing', 'Searching...');
      } else {
        ToastService.showToast('Searching for missing scenes...', true);
      }

      // Analyze current page context for smart filtering
      const filters = SceneComparisonService.analyzeCurrentPageContext();

      console.log('Finding missing scenes with filters:', filters);
      const missingScenes = await SceneComparisonService.findMissingScenes(
        config,
        filters,
        { suppressToasts: Boolean(progressTracker) },
      );

      if (missingScenes.length === 0) {
        if (!progressTracker) {
          ToastService.showToast('No missing scenes found!', true);
        }
        if (progressTracker) {
          progressTracker.updateItem(
            'search',
            'success',
            'No missing scenes found',
          );
          // Remove the search item since operation is complete
          progressTracker.removeItem('search');
        }
        return {
          totalFound: 0,
          totalAdded: 0,
          failed: [],
        };
      }

      console.log(
        `Found ${missingScenes.length} missing scenes, starting batch add...`,
      );
      if (!progressTracker) {
        ToastService.showToast(
          `Found ${missingScenes.length} missing scenes. Adding to Whisparr...`,
          true,
        );
      } else {
        progressTracker.updateItem(
          'search',
          'processing',
          `Found ${missingScenes.length} scenes. Preparing to add...`,
        );
      }

      // Pre-filter scenes to only include those safe to add (not in Whisparr, not excluded)
      const sceneIds = missingScenes.map((scene) => scene.id);
      const safeToAddIds = await SceneComparisonService.getSafeToAddSceneIds(
        config,
        sceneIds,
      );

      console.log(
        `Filtered ${missingScenes.length} scenes down to ${safeToAddIds.length} safe to add`,
      );

      const safeScenes = missingScenes.filter((scene) =>
        safeToAddIds.includes(scene.id),
      );

      // Update the search progress and add only the scenes that will actually be processed
      if (progressTracker) {
        let message = `Found ${missingScenes.length} scenes, ${safeScenes.length} will be added`;

        progressTracker.updateItem('search', 'success', message);

        // Add only the scenes that will actually be processed to the progress modal
        const sceneProgressItems = safeScenes.map((scene) => ({
          id: scene.id,
          name: scene.title || `Scene ${scene.id.substring(0, 8)}`,
        }));
        progressTracker.addItems(sceneProgressItems);

        // Remove the search item now that we have the actual scenes
        progressTracker.removeItem('search');
      }

      // Use the safe scene addition method with pre-filtered scenes
      return await this.addScenesFromList(config, safeScenes, progressTracker);
    } catch (error) {
      console.error('Add all missing scenes failed:', error);
      if (progressTracker) {
        progressTracker.updateItem(
          'search',
          'error',
          `Failed to add missing scenes: ${error}`,
        );
      } else {
        ToastService.showToast('Failed to add missing scenes', false);
      }
      throw error;
    }
  }

  /**
   * Add missing scenes from specific studios (for studio pages)
   */
  static async addAllMissingScenesFromStudios(
    config: Config,
    studioIds: string[],
  ): Promise<{
    totalFound: number;
    totalAdded: number;
    failed: string[];
  }> {
    return await SceneComparisonService.findMissingScenes(config, {
      studios: studioIds,
      excludeExisting: true,
      excludeExcluded: true,
    }).then(async (missingScenes) => {
      console.log(
        `Found ${missingScenes.length} missing scenes from ${studioIds.length} studios`,
      );
      return await this.addScenesFromList(config, missingScenes);
    });
  }

  /**
   * Add missing scenes from specific performers (for performer pages)
   */
  static async addAllMissingScenesFromPerformers(
    config: Config,
    performerIds: string[],
  ): Promise<{
    totalFound: number;
    totalAdded: number;
    failed: string[];
  }> {
    return await SceneComparisonService.findMissingScenes(config, {
      performers: performerIds,
      excludeExisting: true,
      excludeExcluded: true,
    }).then(async (missingScenes) => {
      console.log(
        `Found ${missingScenes.length} missing scenes from ${performerIds.length} performers`,
      );
      return await this.addScenesFromList(config, missingScenes);
    });
  }

  /**
   * Helper method to add scenes from a list with batch processing
   */
  private static async addScenesFromList(
    config: Config,
    scenes: StashDBScene[],
    progressTracker?: ProgressTracker,
  ): Promise<{
    totalFound: number;
    totalAdded: number;
    failed: string[];
  }> {
    const batchSize = 10;
    const results = {
      totalFound: scenes.length,
      totalAdded: 0,
      failed: [] as string[],
    };

    // Skip processing if no scenes to add
    if (scenes.length === 0) {
      console.log('No scenes to add');
      return results;
    }

    for (let i = 0; i < scenes.length; i += batchSize) {
      const batch = scenes.slice(i, i + batchSize);

      const batchPromises = batch.map(async (scene) => {
        if (progressTracker) {
          progressTracker.updateItem(scene.id, 'processing');
        }
        try {
          const status = await this.lookupAndAddScene(config, scene.id);
          if (status === SceneLookupStatus.ADDED) {
            results.totalAdded++;
            if (progressTracker) {
              progressTracker.updateItem(scene.id, 'success');
            }
          } else {
            results.failed.push(scene.id);
            if (progressTracker) {
              progressTracker.updateItem(
                scene.id,
                'error',
                'Failed to add scene',
              );
            }
          }
        } catch (error) {
          console.error(`Failed to add scene ${scene.id}:`, error);
          results.failed.push(scene.id);
          if (progressTracker) {
            progressTracker.updateItem(scene.id, 'error', `Error: ${error}`);
          }
        }
      });

      await Promise.all(batchPromises);

      // Trigger button refresh after each batch to provide real-time feedback
      SceneButtonRefreshService.triggerRefresh();

      // Small delay between batches
      if (i + batchSize < scenes.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Final refresh after all scenes processed
    SceneButtonRefreshService.triggerRefresh();

    return results;
  }
}
