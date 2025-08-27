import { Tooltip } from 'bootstrap';

export class TooltipManager {
  private static tooltips = new Map<Element, Tooltip>();
  private static observer: MutationObserver | null = null;

  static initialize(): void {
    console.log('TooltipManager: Initializing...');
    if (!this.observer) {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Handle removed nodes
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.cleanupElementTooltips(node as Element);
              }
            });

            // Handle added nodes - register new tooltips
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.registerElementTooltips(node as Element);
              }
            });
          }
        });
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
      console.log('TooltipManager: MutationObserver started');
    }
    this.initializeExistingTooltips();

    // Fallback: periodically check for new tooltip elements
    setInterval(() => {
      this.initializeExistingTooltips();
    }, 2000);
  }

  static register(element: Element): void {
    if (this.tooltips.has(element)) {
      return;
    }

    try {
      const tooltip = new Tooltip(element);
      this.tooltips.set(element, tooltip);
      console.log('TooltipManager: Registered tooltip for', element);
    } catch (error) {
      console.warn('Failed to create tooltip for element:', element, error);
    }
  }

  static unregister(element: Element): void {
    const tooltip = this.tooltips.get(element);
    if (tooltip) {
      try {
        tooltip.dispose();
      } catch (error) {
        console.warn('Error disposing tooltip:', error);
      }
      this.tooltips.delete(element);
    }
  }

  static cleanup(): void {
    this.tooltips.forEach((tooltip) => {
      try {
        tooltip.dispose();
      } catch (error) {
        console.warn('Error disposing tooltip during cleanup:', error);
      }
    });
    this.tooltips.clear();
  }

  static cleanupOrphaned(): void {
    const elementsToRemove: Element[] = [];

    this.tooltips.forEach((tooltip, element) => {
      if (!document.contains(element)) {
        try {
          tooltip.dispose();
        } catch (error) {
          console.warn('Error disposing orphaned tooltip:', error);
        }
        elementsToRemove.push(element);
      }
    });

    elementsToRemove.forEach((element) => {
      this.tooltips.delete(element);
    });
  }

  static initializeExistingTooltips(): void {
    const tooltipElements = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    console.log(
      'TooltipManager: Found',
      tooltipElements.length,
      'existing tooltip elements',
    );
    tooltipElements.forEach((element) => {
      this.register(element);
    });
  }

  static reinitializeTooltips(): void {
    this.cleanupOrphaned();
    this.initializeExistingTooltips();
  }

  private static registerElementTooltips(element: Element): void {
    // Register tooltip for the element itself if it has the attribute
    if (
      element.hasAttribute('data-bs-toggle') &&
      element.getAttribute('data-bs-toggle') === 'tooltip'
    ) {
      this.register(element);
    }

    // Register tooltips for any child elements
    const childTooltips = element.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    childTooltips.forEach((child) => {
      this.register(child);
    });
  }

  private static cleanupElementTooltips(element: Element): void {
    // Clean up tooltip for the element itself
    this.unregister(element);

    // Clean up tooltips for any child elements
    const childTooltips = element.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    childTooltips.forEach((child) => {
      this.unregister(child);
    });
  }

  static destroy(): void {
    this.cleanup();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
