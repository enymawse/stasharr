import { PerformerPayloadBuilder } from '../builder/PerformerPayloadBuilder';
import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';
import { responseStatusCodeOK } from '../util/util';
import ServiceBase from './ServiceBase';
import ToastService from './ToastService';

export default class PerformerService extends ServiceBase {
  /**
   * Retrieves performer information from Whisparr using the Stash ID.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {string} stashId - The unique Stash ID of the performer to fetch.
   * @returns {Promise<Whisparr.WhisparrPerformer | null>} - A promise that
   * resolves with the Performer object or null from the Whisparr API.
   */
  static async getPerformerByStashId(
    config: Config,
    stashId: string,
  ): Promise<Whisparr.WhisparrPerformer | null> {
    const endpoint = `performer?stashId=${encodeURIComponent(stashId)}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (error) {
      ToastService.showToast(
        'Error occurred while looking up the performer',
        false,
      );
      console.error('Error in getPerformerByStashId', error);
      return null;
    }
    const data = await response.response;

    if (data?.length > 0) {
      return data[0] as Whisparr.WhisparrPerformer;
    } else {
      return null;
    }
  }

  static async updatePerformer(
    config: Config,
    performer: Whisparr.WhisparrPerformer,
  ): Promise<Whisparr.WhisparrPerformer> {
    const endpoint = `performer/${performer.id}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, 'PUT', performer);
    } catch (e) {
      ToastService.showToast(
        'Error occurred while updating the performer',
        false,
      );
      console.error('Error in update', e);
      return performer;
    }
    const updatedPerformer = await response.response;
    if (updatedPerformer?.length > 0) {
      return updatedPerformer[0] as Whisparr.WhisparrPerformer;
    } else {
      return performer;
    }
  }

  static async addPerformer(
    config: Config,
    stashId: string,
  ): Promise<Whisparr.WhisparrPerformer> {
    const endpoint = 'performer';
    const payload = new PerformerPayloadBuilder()
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
      return response.response as Whisparr.WhisparrPerformer;
    } else {
      throw Error('API Error adding performer: ' + stashId);
    }
  }
}
