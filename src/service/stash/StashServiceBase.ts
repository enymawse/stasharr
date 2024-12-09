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
      }).then((res) => (res as VMScriptResponseObject<any>).response);
    } catch (e) {
      console.error('GM.xmlHttpREquest error', e);
      throw e;
    }
  }
}
