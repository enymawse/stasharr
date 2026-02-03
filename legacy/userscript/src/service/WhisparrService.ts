import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';
import { responseStatusCodeOK } from '../util/util';
import ServiceBase from './ServiceBase';
import ToastService from './ToastService';

export default class WhisparrService extends ServiceBase {
  /**
   * Performs a health check on the Whisparr instance by sending a request to the health endpoint.
   *
   * @param {Config} config - The configuration object containing API details.
   * @returns {Promise<boolean>} - The response from the Whisparr API, indicating the health status of the instance.
   */ static healthCheck(config: Config): Promise<boolean> {
    return ServiceBase.request(config, 'health')
      .then((response) => {
        return responseStatusCodeOK(response.status);
      })
      .catch(() => {
        return false;
      });
  }

  static systemStatus(config: Config): Promise<Whisparr.SystemStatus | null> {
    return ServiceBase.request(config, 'system/status')
      .then((response) => {
        return response.response;
      })
      .catch(() => {
        return null;
      });
  }

  /**
   * Run a Whisparr Command by sending a POST request with the command payload.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {any} body - The payload to send in the request body.
   * @returns {Promise<Whisparr.WhisparrCommandResponse | null>} - The response from the Whisparr API.
   */
  static async command(
    config: Config,
    body: Whisparr.CommandPayload,
  ): Promise<Whisparr.WhisparrCommandResponse | null> {
    const endpoint = 'command';
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'POST', body);
    } catch (e) {
      ToastService.showToast(
        `Error occurred while executing ${body.name} command`,
        false,
      );
      console.error('Error in command', e);
      return null;
    }
    const data = await response.response;
    if (data) {
      return data as Whisparr.WhisparrCommandResponse;
    } else {
      return null;
    }
  }

  static async qualityProfiles(
    config: Config,
  ): Promise<null | Whisparr.QualityProfile[]> {
    const endpoint = 'qualityProfile';
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'GET', undefined);
    } catch (e) {
      console.error('Error getting Quality Profiles: ', e);
      return null;
    }
    return response.response as Whisparr.QualityProfile[];
  }

  static async rootFolderPaths(
    config: Config,
  ): Promise<null | Whisparr.RootFolder[]> {
    const endpoint = 'rootFolder';
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'GET', undefined);
    } catch (e) {
      console.error('Error getting Root Folder Paths: ', e);
      return null;
    }
    return response.response as Whisparr.RootFolder[];
  }

  static async tags(config: Config): Promise<Whisparr.Tag[] | null> {
    const endpoint = 'tag';
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'GET', undefined);
    } catch (e) {
      console.log('Error getting Tags: ', e);
      return null;
    }
    return response.response as Whisparr.Tag[];
  }

  /**
   * Fetches all scenes from Whisparr with pagination support
   */
  static async getAllScenes(
    config: Config,
    options?: { suppressToasts?: boolean },
  ): Promise<Whisparr.WhisparrScene[]> {
    const allScenes: Whisparr.WhisparrScene[] = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    console.log('Starting Whisparr scene inventory fetch...');

    while (hasMore) {
      console.log(`Fetching Whisparr scenes page ${page}...`);

      try {
        const endpoint = `movie?page=${page}&pageSize=${pageSize}`;
        const response = await ServiceBase.request(
          config,
          endpoint,
          'GET',
          undefined,
        );
        const scenes = response.response as Whisparr.WhisparrScene[];

        if (scenes && scenes.length > 0) {
          allScenes.push(...scenes);
          hasMore = scenes.length === pageSize;
          page++;

          // Add small delay to avoid overwhelming the API
          if (hasMore) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Failed to fetch Whisparr scenes page ${page}:`, error);
        if (!options?.suppressToasts) {
          ToastService.showToast(
            `Error fetching scenes from Whisparr: ${error}`,
            false,
          );
        }
        break;
      }
    }

    console.log(`Total Whisparr scenes fetched: ${allScenes.length}`);
    return allScenes;
  }

  /**
   * Create a map of Stash ID to Whisparr scene for quick lookups
   */
  static createStashIdToSceneMap(
    scenes: Whisparr.WhisparrScene[],
  ): Map<string, Whisparr.WhisparrScene> {
    const map = new Map<string, Whisparr.WhisparrScene>();

    scenes.forEach((scene) => {
      if (scene.foreignId && scene.foreignId.startsWith('stash:')) {
        const stashId = scene.foreignId.replace('stash:', '');
        map.set(stashId, scene);
      }
    });

    return map;
  }
}
