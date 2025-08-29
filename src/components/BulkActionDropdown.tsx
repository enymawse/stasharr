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
} from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '../contexts/useSettings';
import SceneService from '../service/SceneService';
import ToastService from '../service/ToastService';
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

    try {
      const results = await SceneService.addAllMissingScenes(store);
      ToastService.showPersistentToast(
        `Add All Missing completed: ${results.totalAdded} scenes added, ${results.failed.length} failed`,
        results.failed.length === 0,
      );
    } catch (error) {
      console.error('Add All Missing failed:', error);
      ToastService.showPersistentToast(
        'Add All Missing operation failed',
        false,
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

    const stashIdtoSceneCardAndStatusMap: StashIdToSceneCardAndStatusMap =
      new Map();
    const sceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(SceneStatus.NOT_IN_WHISPARR),
    );

    sceneCards.forEach((node) => {
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
        }
      }
    });

    try {
      const sceneMap = await SceneService.lookupAndAddAll(
        store,
        stashIdtoSceneCardAndStatusMap,
      );
      ToastService.showPersistentToast(
        `Added ${sceneMap.size} new scenes to Whisparr from page ${pageNumber + 1}.`,
        true,
      );
      rehydrateSceneCards(store, sceneMap);
    } catch (error) {
      console.error('Add All failed:', error);
      ToastService.showPersistentToast('Add All operation failed', false);
    }
  };

  const handleSearchAllOnPage = async () => {
    setShowSearchAllOnPageModal(false);

    const pageNumber: number = parseInt(
      document
        .querySelector<HTMLElement>(StashDB.DOMSelector.DataPage)
        ?.getAttribute(StashDB.DataAttribute.DataPage) || '{Page not found}',
    );

    const stashIds: string[] = [];
    const sceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(
        SceneStatus.EXISTS_AND_NO_FILE,
      ),
    );

    sceneCards.forEach((node) => {
      const stashId = extractStashIdFromSceneCard(node);
      if (stashId) {
        stashIds.push(stashId);
      }
    });

    try {
      await SceneService.triggerWhisparrSearchAll(store, stashIds);
      ToastService.showPersistentToast(
        `Triggered search for ${stashIds.length} existing scenes on page ${pageNumber + 1}.`,
        true,
      );
    } catch (error) {
      console.error('Search All failed:', error);
      ToastService.showPersistentToast('Search All operation failed', false);
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
