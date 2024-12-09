/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import { Config } from '../../models/Config';

export default class StashServiceBase {
  public static async request(
    config: Config,
    requestData: unknown,
  ): Promise<any> {
    try {
      return await GM.xmlHttpRequest({
        url: config.stashGqlEndpoint(),
        method: 'POST',
        responseType: 'json',
        headers: {
          'Content-Type': 'application/json',
          ApiKey: config.stashApiKey,
        },
        data: JSON.stringify(requestData),
      }).then(
        (res) => (res as VMScriptResponseObject<any>).response,
        (res) => (res as VMScriptResponseObject<any>).response,
      );
    } catch (e) {
      console.error('GM.xmlHttpREquest error', e);
      throw e;
    }
  }

  public static async systemStatus(config: Config): Promise<boolean> {
    const query = `
      query SystemStatus {
        systemStatus {
            databaseSchema
            databasePath
            configPath
            appSchema
            status
            os
            workingDir
            homeDir
            ffmpegPath
            ffprobePath
        }
      }`;
    const request = StashServiceBase.request(config, { query });
    return request.then(
      (res) => res?.data?.systemStatus?.status === 'OK',
      () => false,
    );
  }
}
