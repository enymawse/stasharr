import { TooltipManager } from './service/TooltipManager';
import { ControllerManager } from './service/ControllerManager';

import './styles/main.scss';
import { Config } from './models/Config';

(async function () {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // Initialize tooltip management system
  TooltipManager.initialize();

  const config = new Config().load();

  // Initial setup
  ControllerManager.initializeControllers(config);

  // Enhanced navigation detection for React-based SPAs
  let lastUrl = window.location.href;
  let reinitializationTimer: number;

  const checkForNavigation = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log(`🚀 NAVIGATION DETECTED: ${lastUrl} → ${currentUrl}`);
      lastUrl = currentUrl;

      // Clear any pending reinitializations
      if (reinitializationTimer) {
        console.log('⏰ Clearing previous reinitialization timer');
        clearTimeout(reinitializationTimer);
      }

      // Wait longer for React to finish rendering
      console.log('⏳ Setting reinitialization timer for 300ms...');
      reinitializationTimer = window.setTimeout(() => {
        console.log(
          '🔄 Timer triggered - calling ControllerManager.reinitialize',
        );
        ControllerManager.reinitialize(config);
      }, 300);
    }
  };

  // Poll for URL changes (catches React Router navigation)
  setInterval(checkForNavigation, 500);

  // Traditional navigation events (still needed for direct browser actions)
  window.addEventListener('popstate', (event) => {
    console.log(
      '🔙 POPSTATE EVENT detected (back/forward button):',
      event.state,
    );
    checkForNavigation();
  });

  // Override history methods for programmatic navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    console.log('📌 PUSHSTATE detected:', args[2]); // URL is the 3rd argument
    originalPushState.apply(history, args);
    setTimeout(checkForNavigation, 50);
  };

  history.replaceState = function (...args) {
    console.log('🔄 REPLACESTATE detected:', args[2]); // URL is the 3rd argument
    originalReplaceState.apply(history, args);
    setTimeout(checkForNavigation, 50);
  };

  // Additional React-specific detection
  // Listen for DOM changes that might indicate React navigation
  const reactNavigationObserver = new MutationObserver((mutations) => {
    let significantChange = false;
    let detectedChanges: string[] = [];

    mutations.forEach((mutation) => {
      // Check if major page structures changed (indicates navigation)
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            // Look for indicators of new page content
            if (node.classList?.contains('row')) {
              significantChange = true;
              detectedChanges.push('row added');
            }
            if (node.classList?.contains('main')) {
              significantChange = true;
              detectedChanges.push('main added');
            }
            if (node.classList?.contains('content')) {
              significantChange = true;
              detectedChanges.push('content added');
            }
            if (node.querySelector?.('.scenes-list')) {
              significantChange = true;
              detectedChanges.push('scenes-list found');
            }
          }
        });
      }
    });

    if (significantChange) {
      console.log(
        '🔍 DOM MUTATION detected - possible React navigation:',
        detectedChanges.join(', '),
      );
      setTimeout(checkForNavigation, 100);
    }
  });

  // Observe the main content area for React-driven changes
  const mainContent =
    document.querySelector('#root') ||
    document.querySelector('main') ||
    document.body;

  console.log(
    '🔍 Setting up DOM observer on:',
    mainContent?.tagName + (mainContent?.id ? '#' + mainContent.id : ''),
  );

  if (mainContent) {
    reactNavigationObserver.observe(mainContent, {
      childList: true,
      subtree: true,
    });
    console.log('✅ DOM observer is active');
  } else {
    console.log('❌ No suitable container found for DOM observer');
  }

  // Add initial state logging
  console.log('🎯 Initial URL:', window.location.href);
  console.log(
    '🎯 Looking for .scenes-list on load:',
    !!document.querySelector('.scenes-list'),
  );
})();
