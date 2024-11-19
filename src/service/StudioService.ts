import { StudioPayloadBuilder } from '../builder/StudioPayloadBuilder';
import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';
import { responseStatusCodeOK } from '../util/util';
import ServiceBase from './ServiceBase';
import ToastService from './ToastService';

export default class StudioService extends ServiceBase {
  /**
   * Retrieves studio information from Whisparr using the Stash ID.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {string} sceneID - The unique Stash ID of the studio to fetch.
   * @returns {Promise<Whisparr.WhisparrStudio | null>} - A promise that
   * resolves with the Studio or null from the Whisparr API.
   */ static async getStudioByStashId(
    config: Config,
    sceneID: string,
  ): Promise<Whisparr.WhisparrStudio | null> {
    const endpoint = `studio?stashId=${encodeURIComponent(sceneID)}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (e) {
      ToastService.showToast(
        'Error occurred while looking up the studio',
        false,
      );
      console.error('Error in getStudioByStashId', e);
      return null;
    }
    const data = await response.response;
    if (data?.length > 0) {
      return data[0] as Whisparr.WhisparrStudio;
    } else {
      return null;
    }
  }

  static async updateStudio(
    config: Config,
    studio: Whisparr.WhisparrStudio,
  ): Promise<Whisparr.WhisparrStudio> {
    const endpoint = `studio/${studio.id}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'PUT', studio);
    } catch (e) {
      ToastService.showToast('Error occurred while updating the studio', false);
      console.error('Error in update', e);
      return studio;
    }
    const updatedStudio = await response.response;
    if (updatedStudio?.length > 0) {
      return updatedStudio[0] as Whisparr.WhisparrStudio;
    } else {
      return studio;
    }
  }

  static async addStudio(
    config: Config,
    stashId: string,
  ): Promise<Whisparr.WhisparrStudio> {
    const endpoint = 'studio';
    const payload = new StudioPayloadBuilder()
      .setForeignId(stashId)
      .setMonitored(false)
      .setQualityProfileId(config.qualityProfile)
      .setRootFolderPath(config.rootFolderPath)
      .setSearchOnAdd(config.searchForNewMovie)
      .build();
    const response = await ServiceBase.request(
      config,
      endpoint,
      'POST',
      payload,
    );
    if (responseStatusCodeOK(response.status)) {
      return response.response as Whisparr.WhisparrStudio;
    } else {
      throw Error('API Error adding studio: ' + stashId);
    }
  }
}
