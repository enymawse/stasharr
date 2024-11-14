import { ExclusionPayloadBuilder } from "../builder/ExclusionPayloadBuilder";
import { Config } from "../models/Config";
import { ExclusionsMap } from "../types/stasharr";
import { Whisparr } from "../types/whisparr";
import { responseStatusCodeOK } from "../util/util";
import ServiceBase from "./ServiceBase";
import ToastService from "./ToastService";

export default class ExclusionListService extends ServiceBase {
  static async getExclusionsMap(config: Config): Promise<ExclusionsMap> {
    const endpoint = "exclusions";
    let map: ExclusionsMap = new Map();
    let response;
    try {
      response = await ServiceBase.request(config, endpoint);
    } catch (e) {
      ToastService.showToast(
        "Error occurred while looking up Exclusions List",
        false,
      );
      console.error("Error in getExclusionsMap:", e);
      return map;
    }
    const data = (await response.response) as Whisparr.ExclusionList;
    if (data?.length > 0) {
      map = data.reduce((acc, item) => {
        return acc.set(item.foreignId, item);
      }, new Map());
    }
    return map;
  }

  static async removeExclusion(config: Config, id: number): Promise<void> {
    const endpoint = `exclusions/${id}`;
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, "DELETE");
      if (!responseStatusCodeOK(response.status))
        throw new Error(`HTTP Response Status Code: ${response.status}`);
    } catch (e) {
      ToastService.showToast(
        "Error occurred while removing a scene from the exclusion list",
        false,
      );
      console.error("Error in removeExclusion:", e);
      return;
    }
    ToastService.showToast("Removed exclusion", true);
    return;
  }

  static async addExclusion(
    config: Config,
    stashId: string,
  ): Promise<Whisparr.Exclusion | null> {
    const endpoint = "exclusions";
    const payload = new ExclusionPayloadBuilder().setForeignId(stashId).build();
    let response = await ServiceBase.request(config, endpoint, "POST", payload);
    if (responseStatusCodeOK(response.status)) {
      return response.response as Whisparr.Exclusion;
    }
    return null;
  }
}
