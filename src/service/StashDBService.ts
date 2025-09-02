import ServiceBase from './ServiceBase';
import ToastService from './ToastService';

export interface StashDBScene {
  id: string;
  title: string;
  release_date?: string;
  studio?: {
    id: string;
    name: string;
  };
  performers?: Array<{
    id: string;
    name: string;
    as?: string;
  }>;
  fingerprints?: Array<{
    hash: string;
    algorithm: string;
    duration: number;
  }>;
}

export interface StashDBQueryInput {
  text?: string;
  studios?: string[];
  performers?: string[];
  tags?: string[];
  page?: number;
  per_page?: number;
  sort?: 'TITLE' | 'DATE' | 'TRENDING';
  direction?: 'ASC' | 'DESC';
}

export interface StashDBScenesResponse {
  queryScenes: {
    scenes: StashDBScene[];
    count: number;
  };
}

export default class StashDBService extends ServiceBase {
  private static readonly STASHDB_ENDPOINT = 'https://stashdb.org/graphql';
  private static readonly ITEMS_PER_PAGE = 100;

  /**
   * Get the stashbox cookie value for authentication
   */
  private static getStashboxCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'stashbox') {
        return value;
      }
    }
    return null;
  }

  /**
   * Execute a GraphQL query against StashDB
   */
  private static async executeQuery(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<unknown> {
    try {
      const stashboxCookie = this.getStashboxCookie();
      if (!stashboxCookie) {
        throw new Error(
          'StashDB authentication cookie not found. Please log into StashDB first.',
        );
      }

      const response = await fetch(this.STASHDB_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `stashbox=${stashboxCookie}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`StashDB API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('StashDB GraphQL errors:', result.errors);
        throw new Error(
          `GraphQL errors: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`,
        );
      }

      return result.data;
    } catch (error) {
      console.error('StashDB query failed:', error);
      ToastService.showToast('Failed to query StashDB', false);
      throw error;
    }
  }

  /**
   * Search scenes on StashDB with pagination support
   */
  static async searchScenes(
    queryInput: StashDBQueryInput,
  ): Promise<StashDBScenesResponse> {
    const query = `
      query QueryScenes($input: SceneQueryInput!) {
        queryScenes(input: $input) {
          count
          scenes {
            id
            title
            release_date
            studio {
              id
              name
            }
            performers {
              performer {
                id
                name
              }
              as
            }
            fingerprints {
              hash
              algorithm
              duration
            }
          }
        }
      }
    `;

    const input: Record<string, unknown> = {
      page: queryInput.page || 1,
      per_page: Math.min(
        queryInput.per_page || this.ITEMS_PER_PAGE,
        this.ITEMS_PER_PAGE,
      ),
      sort: queryInput.sort || 'DATE',
      direction: queryInput.direction || 'DESC',
    };

    // Add text search if provided
    if (queryInput.text) {
      input.text = queryInput.text;
    }

    // Add studios filter with correct MultiIDCriterionInput format
    if (queryInput.studios && queryInput.studios.length > 0) {
      input.studios = {
        value: queryInput.studios,
        modifier: 'EQUALS',
      };
    }

    // Add performers filter with correct MultiIDCriterionInput format
    if (queryInput.performers && queryInput.performers.length > 0) {
      input.performers = {
        value: queryInput.performers,
        modifier: 'INCLUDES_ALL',
      };
    }

    // Add tags filter with correct MultiIDCriterionInput format
    if (queryInput.tags && queryInput.tags.length > 0) {
      input.tags = {
        value: queryInput.tags,
        modifier: 'INCLUDES_ALL',
      };
    }

    console.log(input);

    return (await this.executeQuery(query, { input })) as StashDBScenesResponse;
  }

  /**
   * Get all scenes from multiple studios
   */
  static async getAllScenesFromStudios(
    studioIds: string[],
  ): Promise<StashDBScene[]> {
    const allScenes: StashDBScene[] = [];
    let page = 1;
    let hasMore = true;

    console.log(`Fetching StashDB scenes from ${studioIds.length} studios...`);

    while (hasMore) {
      console.log(`Fetching StashDB studio scenes page ${page}...`);

      try {
        const response = await this.searchScenes({
          studios: studioIds,
          page,
          per_page: this.ITEMS_PER_PAGE,
          sort: 'DATE',
          direction: 'DESC',
        });

        const scenes = response.queryScenes.scenes;
        allScenes.push(...scenes);

        hasMore = scenes.length === this.ITEMS_PER_PAGE;
        page++;

        // Add small delay to avoid rate limiting
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to fetch scenes from studios:`, error);
        break;
      }
    }

    console.log(
      `Fetched ${allScenes.length} scenes from ${studioIds.length} studios`,
    );
    return allScenes;
  }

  /**
   * Search scenes by performer(s) with pagination
   */
  static async getAllPerformerScenes(
    performerIds: string[],
  ): Promise<StashDBScene[]> {
    const allScenes: StashDBScene[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching StashDB performer scenes page ${page}...`);

      const response = await this.searchScenes({
        performers: performerIds,
        page,
        per_page: this.ITEMS_PER_PAGE,
        sort: 'DATE',
        direction: 'DESC',
      });

      const scenes = response.queryScenes.scenes;
      allScenes.push(...scenes);

      hasMore = scenes.length === this.ITEMS_PER_PAGE;
      page++;

      // Add small delay to avoid rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(`Fetched ${allScenes.length} scenes for performers`);
    return allScenes;
  }

  /**
   * Get all scenes with comprehensive pagination
   */
  static async getAllScenes(
    filters: Omit<StashDBQueryInput, 'page' | 'per_page'> = {},
  ): Promise<StashDBScene[]> {
    const allScenes: StashDBScene[] = [];
    let page = 1;
    let hasMore = true;
    let totalFetched = 0;

    console.log('Starting comprehensive StashDB scene fetch...');

    while (hasMore) {
      console.log(`Fetching StashDB scenes page ${page}...`);

      try {
        const response = await this.searchScenes({
          ...filters,
          page,
          per_page: this.ITEMS_PER_PAGE,
        });

        const scenes = response.queryScenes.scenes;
        allScenes.push(...scenes);
        totalFetched += scenes.length;

        hasMore = scenes.length === this.ITEMS_PER_PAGE;
        page++;

        // Add delay to avoid rate limiting
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Safety check to avoid infinite loops
        if (totalFetched > 50000) {
          console.warn('StashDB fetch limit reached, stopping pagination');
          ToastService.showToast(
            'StashDB query limit reached - partial results returned',
            true,
          );
          break;
        }
      } catch (error) {
        console.error(`Failed to fetch StashDB page ${page}:`, error);
        break;
      }
    }

    console.log(`Total StashDB scenes fetched: ${totalFetched}`);
    return allScenes;
  }

  /**
   * Find a single scene by its ID using StashDB's findScene query
   */
  static async getSceneById(sceneId: string): Promise<StashDBScene | null> {
    const query = `
      query FindScene($id: ID!) {
        findScene(id: $id) {
          id
          title
          release_date
          studio { id name }
          performers { performer { id name } as }
          fingerprints { hash algorithm duration }
        }
      }
    `;

    try {
      const data = (await this.executeQuery(query, { id: sceneId })) as {
        findScene?: StashDBScene | null;
      };
      return (data && data.findScene) || null;
    } catch (error) {
      console.warn(`Failed to fetch scene by id ${sceneId}:`, error);
      return null;
    }
  }

  /**
   * Get scene titles for specific scene IDs
   * Uses multiple smaller queries to avoid overwhelming the API
   */
  static async getSceneTitlesByIds(
    sceneIds: string[],
  ): Promise<Map<string, string>> {
    const titleMap = new Map<string, string>();

    // Query each ID directly via findScene to avoid ambiguous text search results
    for (const id of sceneIds) {
      try {
        const scene = await this.getSceneById(id);
        if (scene && scene.title) {
          titleMap.set(id, scene.title);
        }
      } catch (error) {
        console.warn(`Failed to fetch title for scene ${id}:`, error);
      }
    }

    return titleMap;
  }

  /**
   * Extract StashDB scene IDs from scene objects
   */
  static extractSceneIds(scenes: StashDBScene[]): string[] {
    return scenes.map((scene) => scene.id);
  }
}
