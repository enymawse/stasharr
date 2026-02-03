import { Config } from '../models/Config';
import { CardController } from '../controller/CardController';
import { PerformerController } from '../controller/PerformerController';
import { NavbarController } from '../controller/NavbarController';
import { ScenesListController } from '../controller/ScenesListController';
import { StudioController } from '../controller/StudioController';
import { DetailsController } from '../controller/scene/DetailsController';
import { Controller } from '../interfaces/Controller';

/**
 * Manages controller lifecycle and prevents duplicate initialization
 */
export class ControllerManager {
  private static controllers: Controller[] = [];

  /**
   * Initialize all controllers, disposing of previous instances first
   */
  static initializeControllers(config: Config): void {
    // Dispose of existing controllers to prevent duplicate observers
    this.disposeControllers();

    console.log('ControllerManager: Initializing all controllers...');

    // Create new controller instances
    this.controllers = [
      new NavbarController(config),
      new PerformerController(config),
      new StudioController(config),
      new ScenesListController(config),
      new CardController(config),
      new DetailsController(config),
    ];

    console.log(
      `ControllerManager: Created ${this.controllers.length} controllers`,
    );

    // Initialize each controller with debugging
    this.controllers.forEach((controller, index) => {
      console.log(
        `ControllerManager: Initializing controller ${index} (${controller.constructor.name})`,
      );
      try {
        controller.initialize();
        console.log(
          `ControllerManager: ✅ Controller ${index} (${controller.constructor.name}) initialized successfully`,
        );
      } catch (error) {
        console.error(
          `ControllerManager: ❌ Controller ${index} (${controller.constructor.name}) failed:`,
          error,
        );
      }
    });

    console.log(
      `ControllerManager: Completed initialization of ${this.controllers.length} controllers`,
    );
  }

  /**
   * Dispose of all current controllers to clean up observers
   */
  private static disposeControllers(): void {
    this.controllers.forEach((controller, index) => {
      if (controller.observer) {
        console.log(`ControllerManager: Disposing controller ${index}`);
        controller.observer.disconnect();
      }
    });
    this.controllers = [];

    // Clean up stale Stasharr DOM elements that might be disconnected from SolidJS
    this.cleanupStaleElements();
  }

  /**
   * Remove stale Stasharr elements that are no longer connected to SolidJS components
   */
  private static cleanupStaleElements(): void {
    console.log('ControllerManager: Starting comprehensive cleanup...');

    // More aggressive cleanup for React-based SPAs
    const stasharrSelectors = [
      '[id*="stasharr"]', // Any element with 'stasharr' in ID
      '[class*="stasharr"]', // Any element with 'stasharr' in class
      '#stasharr-actions-dropdown', // Specific dropdown ID
      '.dropdown-menu', // Bootstrap dropdowns (may be orphaned)
      '[data-bs-toggle="tooltip"]', // Tooltip elements
    ];

    let totalRemoved = 0;

    // Also clean up duplicate Stasharr nav links
    const stasharrNavLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.nav-link'),
    ).filter((link) => link.textContent?.trim() === 'Stasharr');

    if (stasharrNavLinks.length > 1) {
      console.log(
        `ControllerManager: Found ${stasharrNavLinks.length} duplicate Stasharr nav links, removing extras`,
      );
      // Keep the first one, remove the rest
      stasharrNavLinks.slice(1).forEach((link) => {
        console.log('ControllerManager: Removing duplicate Stasharr nav link');
        link.remove();
        totalRemoved++;
      });
    }
    stasharrSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        // Be more aggressive - remove any element that looks Stasharr-related
        const isStasharrElement =
          element.id?.includes('stasharr') ||
          Array.from(element.classList || []).some((cls) =>
            cls.includes('stasharr'),
          ) ||
          element.closest('.scenes-list') ||
          // Check if it's a Bootstrap dropdown that might be orphaned from Stasharr
          (element.classList?.contains('dropdown-menu') &&
            element.previousElementSibling?.id?.includes('stasharr'));

        if (isStasharrElement) {
          console.log(
            `ControllerManager: Removing stale element: ${element.tagName}#${element.id || 'no-id'}.${Array.from(element.classList || []).join('.')}`,
          );
          element.remove();
          totalRemoved++;
        }
      });
    });

    // Clean up any orphaned SolidJS elements within scenes-list
    // Use specific known SolidJS attribute names instead of wildcard
    const solidJSSelectors = [
      '[data-solid-render-effect]',
      '[data-solid-context]',
      '[data-solid-component]',
      '[data-solid-portal]',
    ];

    solidJSSelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (element.closest('.scenes-list')) {
            console.log(
              `ControllerManager: Removing orphaned SolidJS element: ${selector}`,
            );
            element.remove();
            totalRemoved++;
          }
        });
      } catch {
        // Silently skip any invalid selectors
        console.warn(
          `ControllerManager: Skipped invalid selector: ${selector}`,
        );
      }
    });

    console.log(
      `ControllerManager: Cleanup complete - removed ${totalRemoved} elements`,
    );
  }

  /**
   * Force re-initialization (useful for navigation events)
   */
  static reinitialize(config: Config): void {
    console.log('🔄 ControllerManager: Forced re-initialization requested');
    console.log(
      '🔍 Current .scenes-list present:',
      !!document.querySelector('.scenes-list'),
    );
    console.log(
      '🔍 Existing stasharr buttons:',
      document.querySelectorAll('[id*="stasharr"], [class*="stasharr"]').length,
    );
    this.initializeControllers(config);
  }
}
