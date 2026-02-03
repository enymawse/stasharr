import { createSignal, Accessor } from 'solid-js';

/**
 * Service for managing global scene button refresh events
 */
export class SceneButtonRefreshService {
  private static refreshSignal = createSignal(0);
  private static refreshCount = this.refreshSignal[0];
  private static setRefreshCount = this.refreshSignal[1];

  /**
   * Get the refresh signal accessor for components to subscribe to
   */
  static getRefreshSignal(): Accessor<number> {
    return this.refreshCount;
  }

  /**
   * Trigger a global refresh of all scene buttons
   * This increments the signal value, causing all subscribers to re-run
   */
  static triggerRefresh(): void {
    console.log('SceneButtonRefreshService: Triggering global button refresh');
    this.setRefreshCount((count) => count + 1);
  }

  /**
   * Trigger refresh for specific scene IDs (for targeted updates)
   * For now this does a global refresh, but could be enhanced for targeted updates
   */
  static triggerRefreshForScenes(sceneIds: string[]): void {
    console.log(
      `SceneButtonRefreshService: Triggering refresh for ${sceneIds.length} scenes`,
    );
    this.triggerRefresh();
  }
}
