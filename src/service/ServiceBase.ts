import { Config } from "../models/Config";
import { responseStatusCodeOK } from "../util/util";

/**
 * Constructs the full API URL for a given endpoint using the configuration.
 *
 * @param {Config} config - The configuration object containing domain, protocol, and API details.
 * @param {string} endpoint - The specific API endpoint.
 * @returns {string} - The full API URL.
 */
function buildApiUrl(config: Config, endpoint: string): string {
  return `${config.whisparrApiUrl()}${endpoint}`;
}

/**
 * Generates the default headers for the API requests, including the API key and any additional headers.
 *
 * @param {Config} config - The configuration object containing API details.
 * @param {object} additionalHeaders - Optional additional headers to include.
 * @returns {object} - The headers object for the request.
 */
function getDefaultHeaders(config: Config, additionalHeaders = {}) {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": config.whisparrApiKey,
    ...additionalHeaders,
  };
}

export default class ServiceBase {
  /**
   * Sends an HTTP request to the Whisparr API with the specified method, endpoint, and body (if applicable).
   *
   * @param {Config} config - The configuration object with the API details.
   * @param {string} endpoint - The API endpoint to send the request to.
   * @param {string} [method="GET"] - The HTTP method (GET, POST, etc.).
   * @param {any} [body] - Optional body for POST/PUT requests.
   * @param {object} [additionalHeaders={}] - Additional headers for the request.
   * @returns {Promise<VMScriptResponseObject<any>>} - The response from the API call.
   * @throws {Error} - If the request fails or returns a non-OK response.
   */
  public static async request(
    config: Config,
    endpoint: string,
    method: "GET" | "POST" | "HEAD" | "PUT" | "DELETE" = "GET",
    body?: any,
    additionalHeaders = {},
  ): Promise<VMScriptResponseObject<any>> {
    const uri = buildApiUrl(config, endpoint);
    const headers = getDefaultHeaders(config, additionalHeaders);

    let response: VMScriptResponseObject<any> = {
      status: 0,
      statusText: "",
      readyState: 0,
      responseHeaders: "",
      response: undefined,
      responseText: undefined,
      responseXML: null,
      finalUrl: "",
    };
    const gmDetails: VMScriptGMXHRDetails<any> = {
      url: uri,
      headers: headers,
      method: method,
      responseType: "json",
      onload: (r: VMScriptResponseObject<any>) => {
        response = r;
      },
    };

    if (body) {
      gmDetails.data = JSON.stringify(body); // Convert body to JSON for POST requests
    }

    try {
      await GM.xmlHttpRequest(gmDetails);
      if (responseStatusCodeOK(response.status)) {
        return response;
      } else {
        console.error(response);
        throw new Error(
          `HTML Response error: ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("GM.xmlHttpRequest error: ", error);
      throw error;
    }
  }
}
