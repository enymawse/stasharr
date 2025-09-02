import { createSignal } from 'solid-js';
import { Dropdown, Modal, Button } from 'solid-bootstrap';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faChevronDown,
  faSearch,
  faDownload,
  faSyncAlt,
  faExclamationTriangle,
  faInfoCircle,
  faTasks,
} from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '../contexts/useSettings';
import SceneService from '../service/SceneService';
import FeedbackService from '../service/FeedbackService';
import StashDBService from '../service/StashDBService';
import { extractStashIdFromSceneCard, rehydrateSceneCards } from '../util/util';
import { StashIdToSceneCardAndStatusMap } from '../types/stasharr';
import { SceneStatus, SceneStatusType } from '../enums/SceneStatus';
import { Stasharr } from '../enums/Stasharr';
import { StashDB } from '../enums/StashDB';
import { parseInt } from 'lodash';

library.add(
  faChevronDown,
  faSearch,
  faDownload,
  faSyncAlt,
  faExclamationTriangle,
  faInfoCircle,
  faTasks,
);

export enum BulkActionType {
  ADD_ALL_ON_PAGE = 'add_all',
  ADD_ALL_MISSING = 'add_all_missing',
  SEARCH_ALL_ON_PAGE = 'search_all',
}

const BulkActionDropdown = () => {
  const { store } = useSettings();
  const [isOpen, setIsOpen] = createSignal(false);
  const [showAddAllMissingModal, setShowAddAllMissingModal] =
    createSignal(false);
  const [showAddAllOnPageModal, setShowAddAllOnPageModal] = createSignal(false);
  const [showSearchAllOnPageModal, setShowSearchAllOnPageModal] =
    createSignal(false);

  const handleAction = async (actionType: BulkActionType) => {
    setIsOpen(false);

    switch (actionType) {
      case BulkActionType.ADD_ALL_MISSING:
        setShowAddAllMissingModal(true);
        break;
      case BulkActionType.ADD_ALL_ON_PAGE:
        setShowAddAllOnPageModal(true);
        break;
      case BulkActionType.SEARCH_ALL_ON_PAGE:
        setShowSearchAllOnPageModal(true);
        break;
    }
  };

  const handleAddAllMissing = async () => {
    setShowAddAllMissingModal(false);

    // Start the operation - update button to show activity
    FeedbackService.startButtonOperation(
      'stasharr-actions-dropdown',
      'Searching...',
    );

    // Start with a placeholder - we'll get the actual scenes from the service
    const progressTracker = FeedbackService.startBulkOperation(
      'Add All Missing Scenes',
      [{ id: 'search', name: 'Searching for missing scenes...' }],
    );
    progressTracker.updateItem('search', 'processing');

    try {
      const results = await SceneService.addAllMissingScenes(
        store,
        progressTracker,
      );

      progressTracker.complete();

      // Show success notification for completed operation
      FeedbackService.showNotification(
        'Stasharr: Add All Missing Complete',
        `Added ${results.totalAdded} scenes, ${results.failed.length} failed`,
      );

      // Complete the operation - show success briefly then restore
      FeedbackService.completeButtonOperation(
        'stasharr-actions-dropdown',
        `Added ${results.totalAdded} scenes`,
        4000,
      );
    } catch (error) {
      console.error('Add All Missing failed:', error);
      progressTracker.updateItem(
        'search',
        'error',
        error instanceof Error ? error.message : String(error),
      );
      progressTracker.complete();
      FeedbackService.completeButtonOperation(
        'stasharr-actions-dropdown',
        'Operation Failed',
        4000,
      );
    }
  };

  const handleAddAllOnPage = async () => {
    setShowAddAllOnPageModal(false);

    const pageNumber: number = parseInt(
      document
        .querySelector<HTMLElement>(StashDB.DOMSelector.DataPage)
        ?.getAttribute(StashDB.DataAttribute.DataPage) || '{Page not found}',
    );

    const addableSceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(SceneStatus.NOT_IN_WHISPARR),
    );

    const stashIdtoSceneCardAndStatusMap: StashIdToSceneCardAndStatusMap =
      new Map();
    const progressItems: { id: string; name: string }[] = [];

    // Process only the addable scenes
    addableSceneCards.forEach((node) => {
      const stashId = extractStashIdFromSceneCard(node);
      if (stashId) {
        const sceneStatusRaw = node
          .querySelector(Stasharr.DOMSelector.CardButton)
          ?.getAttribute(Stasharr.DataAttribute.SceneStatus);
        const sceneStatusNumber = parseInt(sceneStatusRaw || '-1', 10);

        if (sceneStatusNumber > -1) {
          stashIdtoSceneCardAndStatusMap.set(stashId, {
            status: sceneStatusNumber as SceneStatusType,
            sceneCard: node,
          });

          // Add initial progress item with placeholder name
          progressItems.push({
            id: stashId,
            name: `Scene ${stashId.substring(0, 8)}`,
          });

          // Set scene card as processing
          FeedbackService.updateSceneCard(stashId, 'processing');
        }
      }
    });

    if (progressItems.length === 0) {
      // Use progress modal with empty-state info
      const progressTracker = FeedbackService.startBulkOperation(
        `Add All Scenes - Page ${pageNumber + 1}`,
        [],
      );
      progressTracker.setInfo('No scenes available to add on this page.');
      progressTracker.complete();
      return;
    }

    // Start the operation - update button to show activity
    FeedbackService.startButtonOperation(
      'stasharr-actions-dropdown',
      'Adding...',
    );

    const progressTracker = FeedbackService.startBulkOperation(
      `Add All Scenes - Page ${pageNumber + 1}`,
      progressItems,
    );

    // Fetch real scene titles from StashDB and update progress items
    try {
      const sceneIds = progressItems.map((item) => item.id);
      const titleMap = await StashDBService.getSceneTitlesByIds(sceneIds);

      // Update item names in place to avoid duplicate IDs removal
      const updatedItems = progressItems
        .map((item) => ({
          id: item.id,
          name: titleMap.get(item.id) || item.name,
        }))
        .filter((u) => !!u.name);
      if ((updatedItems?.length || 0) > 0) {
        // Use bulk name update for efficiency
        progressTracker.updateItemNames(updatedItems);
      }
    } catch (error) {
      console.warn('Failed to fetch scene titles from StashDB:', error);
      // Continue with placeholder names if fetching fails
    }

    try {
      const sceneMap = await SceneService.lookupAndAddAll(
        store,
        stashIdtoSceneCardAndStatusMap,
        progressTracker,
      );

      progressTracker.complete();
      rehydrateSceneCards(store, sceneMap);

      // Complete the operation - show success briefly then restore
      FeedbackService.completeButtonOperation(
        'stasharr-actions-dropdown',
        `Added ${sceneMap.size} scenes`,
        3000,
      );

      // Show notification
      FeedbackService.showNotification(
        'Stasharr: Add All Complete',
        `Added ${sceneMap.size} scenes from page ${pageNumber + 1}`,
      );
    } catch (error) {
      console.error('Add All failed:', error);
      // Mark all progress items as error
      progressItems.forEach((item) => {
        progressTracker.updateItem(
          item.id,
          'error',
          error instanceof Error ? error.message : String(error),
        );
      });
      progressTracker.complete();
      FeedbackService.completeButtonOperation(
        'stasharr-actions-dropdown',
        'Operation Failed',
        4000,
      );

      // Mark all scene cards as error
      progressItems.forEach((item) => {
        FeedbackService.updateSceneCard(item.id, 'error');
      });
    }
  };

  const handleSearchAllOnPage = async () => {
    setShowSearchAllOnPageModal(false);

    const pageNumber: number = parseInt(
      document
        .querySelector<HTMLElement>(StashDB.DOMSelector.DataPage)
        ?.getAttribute(StashDB.DataAttribute.DataPage) || '{Page not found}',
    );

    const searchableSceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(
        SceneStatus.EXISTS_AND_NO_FILE,
      ),
    );

    const stashIds: string[] = [];
    const progressItems: { id: string; name: string }[] = [];

    // Process only the searchable scenes
    searchableSceneCards.forEach((node) => {
      const stashId = extractStashIdFromSceneCard(node);
      if (stashId) {
        stashIds.push(stashId);

        // Add initial progress item with placeholder name
        progressItems.push({
          id: stashId,
          name: `Scene ${stashId.substring(0, 8)}`,
        });

        // Set scene card as processing
        FeedbackService.updateSceneCard(stashId, 'processing');
      }
    });

    if (stashIds.length === 0) {
      // Use progress modal with empty-state info
      const progressTracker = FeedbackService.startBulkOperation(
        `Search All Scenes - Page ${pageNumber + 1}`,
        [],
      );
      // @ts-ignore: runtime method exists on tracker
      progressTracker.setInfo('No scenes available to search on this page.');
      progressTracker.complete();
      return;
    }

    // Start the operation - update button to show activity
    FeedbackService.startButtonOperation(
      'stasharr-actions-dropdown',
      'Searching...',
    );

    const progressTracker = FeedbackService.startBulkOperation(
      `Search All Scenes - Page ${pageNumber + 1}`,
      progressItems,
    );

    // Fetch real scene titles from StashDB and update progress items
    try {
      const sceneIds = progressItems.map((item) => item.id);
      const titleMap = await StashDBService.getSceneTitlesByIds(sceneIds);

      // Update item names in place to avoid duplicate IDs removal
      const updatedItems = progressItems
        .map((item) => ({
          id: item.id,
          name: titleMap.get(item.id) || item.name,
        }))
        .filter((u) => !!u.name);
      if ((updatedItems?.length || 0) > 0) {
        progressTracker.updateItemNames(updatedItems);
      }
    } catch (error) {
      console.warn('Failed to fetch scene titles from StashDB:', error);
      // Continue with placeholder names if fetching fails
    }

    try {
      await SceneService.triggerWhisparrSearchAll(
        store,
        stashIds,
        progressTracker,
      );

      progressTracker.complete();

      // Mark all scenes as success (search triggered)
      stashIds.forEach((stashId) => {
        FeedbackService.updateSceneCard(stashId, 'success');
      });

      // Complete the operation - show success briefly then restore
      FeedbackService.completeButtonOperation(
        'stasharr-actions-dropdown',
        `Searched ${stashIds.length} scenes`,
        3000,
      );

      // No toast; modal shows success summary
    } catch (error) {
      console.error('Search All failed:', error);
      // Mark all progress items as error
      progressItems.forEach((item) => {
        progressTracker.updateItem(
          item.id,
          'error',
          error instanceof Error ? error.message : String(error),
        );
      });
      progressTracker.complete();
      FeedbackService.completeButtonOperation(
        'stasharr-actions-dropdown',
        'Search Failed',
        4000,
      );

      // Mark all scene cards as error
      stashIds.forEach((stashId) => {
        FeedbackService.updateSceneCard(stashId, 'error');
      });
    }
  };

  // Cancel handlers for modals
  const handleAddAllMissingCancel = () => {
    setShowAddAllMissingModal(false);
  };

  const handleAddAllOnPageCancel = () => {
    setShowAddAllOnPageModal(false);
  };

  const handleSearchAllOnPageCancel = () => {
    setShowSearchAllOnPageModal(false);
  };

  const getActionDetails = (actionType: BulkActionType) => {
    switch (actionType) {
      case BulkActionType.ADD_ALL_ON_PAGE:
        return {
          icon: 'fa-solid fa-download',
          label: 'Add All on Page',
          description: 'Add all available scenes on this page to Whisparr',
          className: 'text-primary',
        };
      case BulkActionType.ADD_ALL_MISSING:
        return {
          icon: 'fa-solid fa-sync-alt',
          label: 'Add All Missing',
          description:
            'Find and add all scenes missing from your Whisparr library',
          className: 'text-success',
        };
      case BulkActionType.SEARCH_ALL_ON_PAGE:
        return {
          icon: 'fa-solid fa-search',
          label: 'Search All on Page',
          description: 'Search all monitored scenes on this page in Whisparr',
          className: 'text-warning',
        };
    }
  };

  return (
    <>
      <div class="ms-3 mb-2">
        <Dropdown show={isOpen()} onToggle={setIsOpen}>
          <Dropdown.Toggle
            variant="primary"
            id="stasharr-actions-dropdown"
            class="stasharr-button"
            data-bs-toggle="tooltip"
            data-bs-title="Bulk actions for scenes"
          >
            <FontAwesomeIcon icon="fa-solid fa-download" /> Stasharr Actions{' '}
            <FontAwesomeIcon icon="fa-solid fa-chevron-down" />
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Header>Bulk Scene Actions</Dropdown.Header>

            {[
              BulkActionType.ADD_ALL_ON_PAGE,
              BulkActionType.SEARCH_ALL_ON_PAGE,
              BulkActionType.ADD_ALL_MISSING,
            ].map((actionType) => {
              const details = getActionDetails(actionType);
              return (
                <Dropdown.Item
                  onClick={() => handleAction(actionType)}
                  class={`${details.className} py-2`}
                >
                  <div class="d-flex align-items-start">
                    <div class="me-3 mt-1" style={{ width: '16px' }}>
                      <FontAwesomeIcon icon={details.icon} />
                    </div>
                    <div>
                      <div class="fw-semibold">{details.label}</div>
                      <small class="text-muted">{details.description}</small>
                    </div>
                  </div>
                </Dropdown.Item>
              );
            })}

            <Dropdown.Divider />
            <Dropdown.ItemText class="text-muted small px-3">
              Actions will show confirmation before executing
            </Dropdown.ItemText>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Confirmation Modal for Add All Missing */}
      <Modal
        show={showAddAllMissingModal()}
        onHide={handleAddAllMissingCancel}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <span class="me-2 text-warning">
              <FontAwesomeIcon icon="fa-solid fa-sync-alt" />
            </span>
            Confirm Add All Missing
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div class="mb-3">
            <p class="mb-2">
              This will search StashDB and Whisparr to find{' '}
              <strong>ALL missing scenes</strong> from the current context
              (studio/performer/page).
            </p>
            <div class="alert alert-warning" role="alert">
              <span class="me-2">
                <FontAwesomeIcon icon="fa-solid fa-exclamation-triangle" />
              </span>
              <strong>Warning:</strong> This operation may take several minutes
              and will query both APIs extensively.
            </div>
            <p class="mb-0 text-muted">Are you sure you want to continue?</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleAddAllMissingCancel}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleAddAllMissing}>
            <span class="me-2">
              <FontAwesomeIcon icon="fa-solid fa-sync-alt" />
            </span>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal for Add All on Page */}
      <Modal
        show={showAddAllOnPageModal()}
        onHide={handleAddAllOnPageCancel}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <span class="me-2 text-primary">
              <FontAwesomeIcon icon="fa-solid fa-download" />
            </span>
            Confirm Add All on Page
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div class="mb-3">
            <p class="mb-2">
              This will add <strong>all available scenes</strong> on this page
              to Whisparr.
            </p>
            <div class="alert alert-info" role="alert">
              <span class="me-2">
                <FontAwesomeIcon icon="fa-solid fa-info-circle" />
              </span>
              <strong>Note:</strong> Only scenes not already in your Whisparr
              library will be added.
            </div>
            <p class="mb-0 text-muted">Are you sure you want to continue?</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleAddAllOnPageCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddAllOnPage}>
            <span class="me-2">
              <FontAwesomeIcon icon="fa-solid fa-download" />
            </span>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal for Search All on Page */}
      <Modal
        show={showSearchAllOnPageModal()}
        onHide={handleSearchAllOnPageCancel}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <span class="me-2 text-warning">
              <FontAwesomeIcon icon="fa-solid fa-search" />
            </span>
            Confirm Search All on Page
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div class="mb-3">
            <p class="mb-2">
              This will trigger a search for{' '}
              <strong>all monitored scenes</strong> on this page in Whisparr.
            </p>
            <div class="alert alert-info" role="alert">
              <span class="me-2">
                <FontAwesomeIcon icon="fa-solid fa-info-circle" />
              </span>
              <strong>Note:</strong> Only scenes that exist in Whisparr but have
              no files will be searched.
            </div>
            <p class="mb-0 text-muted">Are you sure you want to continue?</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleSearchAllOnPageCancel}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleSearchAllOnPage}>
            <span class="me-2">
              <FontAwesomeIcon icon="fa-solid fa-search" />
            </span>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BulkActionDropdown;
