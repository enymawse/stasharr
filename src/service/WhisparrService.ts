import { SceneStatus } from "../enums/SceneStatus";
import { Config } from "../models/Config";
import { ScenePayloadBuilder } from "../builder/ScenePayloadBuilder";
import { Whisparr } from "../types/types";

export default class WhisparrService {
  /**
   * Constructs the full API URL for a given endpoint using the configuration.
   *
   * @param {Config} config - The configuration object containing domain, scheme, and API details.
   * @param {string} endpoint - The specific API endpoint.
   * @returns {string} - The full API URL.
   */
  private static buildApiUrl(config: Config, endpoint: string): string {
    return `${config.scheme}://${config.domain}/api/v3/${endpoint}`;
  }

  /**
   * Generates the default headers for the API requests, including the API key and any additional headers.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {object} additionalHeaders - Optional additional headers to include.
   * @returns {object} - The headers object for the request.
   */
  private static getDefaultHeaders(config: Config, additionalHeaders = {}) {
    return {
      "Content-Type": "application/json",
      "X-Api-Key": config.whisparrApiKey,
      ...additionalHeaders,
    };
  }

  /**
   * Sends an HTTP request to the Whisparr API with the specified method, endpoint, and body (if applicable).
   *
   * @param {Config} config - The configuration object with the API details.
   * @param {string} endpoint - The API endpoint to send the request to.
   * @param {string} [method="GET"] - The HTTP method (GET, POST, etc.).
   * @param {any} [body] - Optional body for POST/PUT requests.
   * @param {object} [additionalHeaders={}] - Additional headers for the request.
   * @returns {Promise<Response>} - The response from the API call.
   * @throws {Error} - If the request fails or returns a non-OK response.
   */
  private static async request(
    config: Config,
    endpoint: string,
    method: string = "GET",
    body?: any,
    additionalHeaders = {},
  ): Promise<Response> {
    const uri = WhisparrService.buildApiUrl(config, endpoint);
    const headers = WhisparrService.getDefaultHeaders(
      config,
      additionalHeaders,
    );

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body); // Convert body to JSON for POST requests
    }

    try {
      const response = await fetch(uri, options);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error("Fetch error: ", error);
      throw error;
    }
  }

  /**
   * Performs a health check on the Whisparr instance by sending a request to the health endpoint.
   *
   * @param {Config} config - The configuration object containing API details.
   * @returns {Promise<Response>} - The response from the Whisparr API, indicating the health status of the instance.
   */ static healthCheck(config: Config): Promise<Response> {
    return WhisparrService.request(config, "health");
  }

  /**
   * Retrieves scene information from Whisparr using the Stash ID.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {string} sceneID - The unique Stash ID of the scene to fetch.
   * @returns {Promise<Response>} - A promise that resolves with the response from the Whisparr API containing scene details.
   */ static getSceneByStashId(
    config: Config,
    sceneID: string,
  ): Promise<Response> {
    const endpoint = `movie?stashId=${encodeURIComponent(sceneID)}`;
    return WhisparrService.request(config, endpoint);
  }

  /**
   * Sends a request to search for a scene in Whisparr by its scene ID.
   *
   * @param {Config} config - The configuration object containing necessary API details.
   * @param {string} sceneID - The unique identifier of the scene to search for.
   * @returns {Promise<Response>} - A promise that resolves with the response from the Whisparr API.
   */
  static searchScene(config: Config, sceneID: string): Promise<Response> {
    const endpoint = `lookup/scene?term=stash:${encodeURIComponent(sceneID)}`;
    return WhisparrService.request(config, endpoint);
  }

  /**
   * Adds a scene to Whisparr by sending a POST request with the scene payload.
   *
   * @param {Config} config - The configuration object containing API details.
   * @param {any} body - The payload to send in the request body.
   * @returns {Promise<Response>} - The response from the Whisparr API.
   */
  static addScene(config: Config, body: any): Promise<Response> {
    const endpoint = "movie";
    return WhisparrService.request(config, endpoint, "POST", body, {
      "Content-Type": "application/json",
    });
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
   */
  static async searchAndAddScene(
    config: Config,
    sceneID: string,
  ): Promise<SceneStatus> {
    try {
      const searchResponse = await WhisparrService.searchScene(config, sceneID);
      if (!searchResponse.ok) {
        throw new Error(`Failed to search scene: ${searchResponse.statusText}`);
      }
      const searchData = await searchResponse.json();
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
        if (!addScenePostResponse.ok) {
          const postData = await addScenePostResponse.json();
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
   * Looks up a scene by its Stash ID in the Whisparr API and determines its download status.
   *
   * @param {Config} config - The configuration object with the API details.
   * @param {string} sceneID - The unique identifier of the scene.
   * @returns {Promise<SceneStatus>} - The status of the scene (e.g., NEW, EXISTS, DOWNLOADED).
   * @throws {Error} - If the scene lookup fails or the API call encounters an error.
   */
  static async handleSceneLookup(
    config: Config,
    sceneID: string,
  ): Promise<SceneStatus> {
    try {
      const response = await WhisparrService.getSceneByStashId(config, sceneID);
      const data = await response.json();

      if (data?.length > 0) {
        return data[0].hasFile ? SceneStatus.DOWNLOADED : SceneStatus.EXISTS;
      } else {
        return SceneStatus.NEW;
      }
    } catch (error) {
      console.error("API Call Error:", error);
      throw new Error("Error checking scene in Whisparr.");
    }
  }

  static async getQualityProfiles(
    config: Config,
  ): Promise<Whisparr.QualityProfile[]> {
    const endpoint = "qualityProfile";
    const response = await WhisparrService.request(
      config,
      endpoint,
      "GET",
      undefined,
      {
        "Content-Type": "application/json",
      },
    )
      .then((response) => response.json())
      .then((json) => {
        console.log(json);
        return json as Whisparr.QualityProfile[];
      });
    return response;
  }

  static async getRootFolders(config: Config): Promise<Whisparr.RootFolder[]> {
    const endpoint = "rootFolder";
    const response = await WhisparrService.request(
      config,
      endpoint,
      "GET",
      undefined,
      {
        "Content-Type": "application/json",
      },
    )
      .then((response) => response.json())
      .then((json) => {
        console.log(json);
        return json as Whisparr.RootFolder[];
      });
    return response;
  }
}
