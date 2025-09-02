import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';
import { StashDBScene } from './StashDBService';
import StashDBService from './StashDBService';
import WhisparrService from './WhisparrService';
import ExclusionListService from './ExclusionListService';
import ToastService from './ToastService';

export interface MissingSceneInfo {
  stashdbScene: StashDBScene;
  reason: 'not_in_whisparr' | 'excluded';
}

export interface SceneComparisonResult {
  stashdbScenes: StashDBScene[];
  whisparrScenes: Whisparr.WhisparrScene[];
  missingScenes: MissingSceneInfo[];
  existingStashIds: Set<string>;
  excludedStashIds: Set<string>;
  totalStashDBScenes: number;
  totalWhisparrScenes: number;
  totalMissing: number;
}

export interface ComparisonFilters {
  studios?: string[];
  performers?: string[];
  tags?: string[];
  excludeExisting?: boolean;
  excludeExcluded?: boolean;
}

export default class SceneComparisonService {
  /**
   * Perform comprehensive comparison between StashDB and Whisparr
   */
  static async compareScenes(
    config: Config,
    filters: ComparisonFilters = {},
    options?: { suppressToasts?: boolean },
  ): Promise<SceneComparisonResult> {
    try {
      console.log('Starting comprehensive scene comparison...');
      if (!options?.suppressToasts) {
        ToastService.showToast('Analyzing scene libraries...', true);
      }

      // Fetch data from both platforms in parallel
      const [stashdbScenes, whisparrScenes, exclusionMap] = await Promise.all([
        this.fetchStashDBScenes(filters, options),
        WhisparrService.getAllScenes(config, {
          suppressToasts: options?.suppressToasts,
        }),
        ExclusionListService.getExclusionsMap(config, options?.suppressToasts),
      ]);

      console.log(
        `Fetched ${stashdbScenes.length} StashDB scenes and ${whisparrScenes.length} Whisparr scenes`,
      );

      // Create lookup maps for efficient comparison
      const whisparrStashIdMap =
        WhisparrService.createStashIdToSceneMap(whisparrScenes);
      const existingStashIds = new Set(whisparrStashIdMap.keys());
      const excludedStashIds = new Set(exclusionMap.keys());

      // Find missing scenes
      const missingScenes: MissingSceneInfo[] = [];

      for (const stashdbScene of stashdbScenes) {
        const isExcluded = excludedStashIds.has(stashdbScene.id);
        const existsInWhisparr = existingStashIds.has(stashdbScene.id);

        if (!existsInWhisparr) {
          if (filters.excludeExcluded && isExcluded) {
            continue; // Skip excluded scenes if requested
          }

          missingScenes.push({
            stashdbScene,
            reason: isExcluded ? 'excluded' : 'not_in_whisparr',
          });
        }
      }

      const result: SceneComparisonResult = {
        stashdbScenes,
        whisparrScenes,
        missingScenes,
        existingStashIds,
        excludedStashIds,
        totalStashDBScenes: stashdbScenes.length,
        totalWhisparrScenes: whisparrScenes.length,
        totalMissing: missingScenes.length,
      };

      console.log(
        `Comparison complete: ${result.totalMissing} missing scenes found`,
      );
      if (!options?.suppressToasts) {
        ToastService.showToast(
          `Found ${result.totalMissing} missing scenes out of ${result.totalStashDBScenes} StashDB scenes`,
          true,
        );
      }

      return result;
    } catch (error) {
      console.error('Scene comparison failed:', error);
      if (!options?.suppressToasts) {
        ToastService.showToast('Failed to compare scene libraries', false);
      }
      throw error;
    }
  }

  /**
   * Find scenes missing from specific context (current page, studio, performer)
   */
  static async findMissingScenes(
    config: Config,
    filters: ComparisonFilters = {},
    options?: { suppressToasts?: boolean },
  ): Promise<StashDBScene[]> {
    const comparison = await this.compareScenes(
      config,
      {
        ...filters,
        excludeExcluded: true, // Don't include excluded scenes in missing list
      },
      options,
    );

    return comparison.missingScenes
      .filter((missing) => missing.reason === 'not_in_whisparr')
      .map((missing) => missing.stashdbScene);
  }

  /**
   * Get scene IDs that are safe to add (not excluded, not existing)
   */
  static async getSafeToAddSceneIds(
    config: Config,
    stashdbSceneIds: string[],
  ): Promise<string[]> {
    const [whisparrScenes, exclusionMap] = await Promise.all([
      WhisparrService.getAllScenes(config),
      ExclusionListService.getExclusionsMap(config),
    ]);

    console.log(whisparrScenes);

    const existingStashIds = new Set(
      whisparrScenes.map((scene) => scene.stashId),
    );
    const excludedStashIds = new Set(exclusionMap.keys());

    return stashdbSceneIds.filter(
      (sceneId) =>
        !existingStashIds.has(sceneId) && !excludedStashIds.has(sceneId),
    );
  }

  /**
   * Fetch StashDB scenes based on filters
   */
  private static async fetchStashDBScenes(
    filters: ComparisonFilters,
    options?: { suppressToasts?: boolean },
  ): Promise<StashDBScene[]> {
    if (filters.studios && filters.studios.length > 0) {
      return await StashDBService.getAllScenesFromStudios(
        filters.studios,
        options,
      );
    }

    if (filters.performers && filters.performers.length > 0) {
      return await StashDBService.getAllPerformerScenes(
        filters.performers,
        options,
      );
    }

    // Default to comprehensive fetch with optional text/tag filters
    return await StashDBService.getAllScenes(
      {
        tags: filters.tags,
      },
      options,
    );
  }

  /**
   * Extract unique studio IDs from current page URL
   */
  static extractCurrentPageStudioIds(): string[] {
    const studioIds = new Set<string>();

    // Extract from studio page if we're on a studio page
    const studioMatch = window.location.pathname.match(
      /\/studios\/([a-f0-9-]+)/,
    );
    if (studioMatch) {
      studioIds.add(studioMatch[1]);
    }

    return Array.from(studioIds);
  }

  /**
   * Extract unique performer IDs from current page URL
   */
  static extractCurrentPagePerformerIds(): string[] {
    const performerIds = new Set<string>();

    // Extract from performer page if we're on a performer page
    const performerMatch = window.location.pathname.match(
      /\/performers\/([a-f0-9-]+)/,
    );
    if (performerMatch) {
      performerIds.add(performerMatch[1]);
    }

    return Array.from(performerIds);
  }

  /**
   * Analyze current page context and suggest optimal comparison strategy
   */
  static analyzeCurrentPageContext(): ComparisonFilters {
    const studioIds = this.extractCurrentPageStudioIds();
    const performerIds = this.extractCurrentPagePerformerIds();

    const filters: ComparisonFilters = {
      excludeExisting: true,
      excludeExcluded: true,
    };

    if (studioIds.length > 0) {
      filters.studios = studioIds;
      console.log(
        `Context: Studio-based comparison with ${studioIds.length} studios`,
      );
    } else if (performerIds.length > 0) {
      filters.performers = performerIds;
      console.log(
        `Context: Performer-based comparison with ${performerIds.length} performers`,
      );
    } else {
      console.log('Context: General comparison (all scenes)');
    }

    return filters;
  }
}
