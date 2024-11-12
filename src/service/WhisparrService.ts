import { SceneStatus } from "../enums/SceneStatus";
import { Config } from "../models/Config";
import { CommandPayloadBuilder } from "../builder/CommandPayloadBuilder";
import { ScenePayloadBuilder } from "../builder/ScenePayloadBuilder";
import { Whisparr } from "../types/types";
import ServiceBase from "./ServiceBase";
import ToastService from "./ToastService";

export default class WhisparrService extends ServiceBase {
  /**
   * Performs a health check on the Whisparr instance by sending a request to the health endpoint.
   *
   * @param {Config} config - The configuration object containing API details.
   * @returns {Promise<boolean>} - The response from the Whisparr API, indicating the health status of the instance.
   */ static healthCheck(config: Config): Promise<boolean> {
    return ServiceBase.request(config, "health").then((response) => {
      return response.status >= 200 && response.status < 300;
    });
  }

  /**
   * Sends a request to search for a scene in Whisparr by its scene ID.
   *
   * @param {Config} config - The configuration object containing necessary API details.
   * @param {string} sceneID - The unique identifier of the scene to search for.
   * @returns {Promise<VMScriptResponseObject<any>>} - A promise that resolves with the response from the Whisparr API.
   * @deprecated
   */
  static searchScene(
    config: Config,
    sceneID: string,
  ): Promise<VMScriptResponseObject<any>> {
    const endpoint = `lookup/scene?term=stash:${encodeURIComponent(sceneID)}`;
    return ServiceBase.request(config, endpoint);
  }

  /**
   * Adds a scene to Whisparr by sending a POST request with the scene payload.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {Whisparr.MoviePayload} body - The payload to send in the request body.
   * @returns {Promise<VMScriptResponseObject<any>>} - The response from the Whisparr API.
   * @deprecated
   */
  static addScene(
    config: Config,
    body: Whisparr.MoviePayload,
  ): Promise<VMScriptResponseObject<any>> {
    const endpoint = "movie";
    return ServiceBase.request(config, endpoint, "POST", body, {
      "Content-Type": "application/json",
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
    const endpoint = "command";
    let response;
    try {
      response = await ServiceBase.request(config, endpoint, "POST", body);
    } catch (e) {
      ToastService.showToast(
        `Error occurred while executing ${body.name} command`,
        false,
      );
      console.error("Error in command", e);
      return null;
    }
    const data = await response.response;
    if (data) {
      return data as Whisparr.WhisparrCommandResponse;
    } else {
      return null;
    }
  }

  /**
   * Searches for a scene in Whisparr by its scene ID and adds it to the collection if found.
   *
   * This method performs a scene lookup in Whisparr using the provided scene ID. If the scene is found,
   * it constructs a payload with the necessary details and adds the scene to Whisparr's collection.
   * If the scene is not found or there is an error during the process, the appropriate scene status is returned.
   *
   * @param {Config} config - The configuration object containing API details and user preferences.
   * @param {string} sceneID - The unique identifier of the scene to search for and add.
   * @returns {Promise<SceneStatus>} - A promise that resolves with the status of the scene (ADDED, NOT_FOUND, or ERROR).
   *
   * @throws {Error} - If the search or add operation fails, an error is thrown with a message detailing the issue.
   * @deprecated
   */
  static async searchAndAddScene(
    config: Config,
    sceneID: string,
  ): Promise<SceneStatus> {
    try {
      const searchResponse = await WhisparrService.searchScene(config, sceneID);
      if (searchResponse.status < 200 || searchResponse.status >= 300) {
        throw new Error(`Failed to search scene: ${searchResponse.statusText}`);
      }
      const searchData = await searchResponse.response;
      if (searchData?.length > 0) {
        let sceneData = searchData[0];
        let payload = new ScenePayloadBuilder()
          .setTitle(sceneData.movie.title)
          .setStudio(sceneData.movie.studioTitle)
          .setForeignId(sceneData.foreignId)
          .setMonitored(true)
          .setSearchForMovie(config.searchForNewMovie)
          .setRootFolderPath(config.rootFolderPath)
          .setQualityProfileId(config.qualityProfile)
          .build();
        const addScenePostResponse = await WhisparrService.addScene(
          config,
          payload,
        );
        if (
          addScenePostResponse.status < 200 ||
          addScenePostResponse.status >= 300
        ) {
          const postData = await addScenePostResponse.response;
          throw new Error(postData?.[0]?.errorMessage || "Error occurred.");
        }
        return SceneStatus.ADDED;
      } else {
        return SceneStatus.NOT_FOUND;
      }
    } catch (error) {
      console.error("Error during search and add scene:", error);
      return SceneStatus.ERROR;
    }
  }

  /**
   *
   * @param config
   * @param stashIds
   * @deprecated
   */
  static async addAll(config: Config, stashIds: string[]): Promise<void> {
    try {
      await stashIds.map((stashId) => {
        return WhisparrService.searchAndAddScene(config, stashId);
      });
    } catch (error) {
      console.error("Error during addAll: ", error);
    }
  }

  static async getQualityProfiles(
    config: Config,
  ): Promise<Whisparr.QualityProfile[]> {
    const endpoint = "qualityProfile";
    const response = await ServiceBase.request(
      config,
      endpoint,
      "GET",
      undefined,
      {
        "Content-Type": "application/json",
      },
    )
      .then((response) => response.response)
      .then((json) => {
        return json as Whisparr.QualityProfile[];
      });
    return response;
  }

  static async getQualityProfilesForSelectMenu(
    config: Config,
  ): Promise<{ id: number; name: string }[]> {
    let options: { id: number; name: string }[] = [];
    await WhisparrService.getQualityProfiles(config).then(
      (response: Whisparr.QualityProfile[]) => {
        response.forEach((qualityProfile) => {
          options.push({
            id: qualityProfile.id,
            name: qualityProfile.name,
          });
        });
      },
    );
    return options;
  }

  static async getRootFolderPathsForSelectMenu(
    config: Config,
  ): Promise<{ id: number; name: string }[]> {
    let options: { id: number; name: string }[] = [];

    await WhisparrService.getRootFolders(config).then(
      (response: Whisparr.RootFolder[]) => {
        response.forEach((rootFolder) => {
          options.push({
            id: rootFolder.id,
            name: rootFolder.path,
          });
        });
      },
    );

    return options;
  }

  static async getRootFolders(config: Config): Promise<Whisparr.RootFolder[]> {
    const endpoint = "rootFolder";
    const response = await ServiceBase.request(
      config,
      endpoint,
      "GET",
      undefined,
      {
        "Content-Type": "application/json",
      },
    )
      .then((response) => response.response)
      .then((json) => {
        return json as Whisparr.RootFolder[];
      });
    return response;
  }
}
