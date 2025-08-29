import { createSignal } from 'solid-js';
import { Dropdown } from 'solid-bootstrap';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faChevronDown,
  faSearch,
  faDownload,
  faSyncAlt,
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

library.add(faChevronDown, faSearch, faDownload, faSyncAlt);

export enum BulkActionType {
  ADD_ALL = 'add_all',
  ADD_ALL_MISSING = 'add_all_missing',
  SEARCH_ALL = 'search_all',
}

const BulkActionDropdown = () => {
  const { store } = useSettings();
  const [isOpen, setIsOpen] = createSignal(false);

  const handleAction = async (actionType: BulkActionType) => {
    setIsOpen(false);

    switch (actionType) {
      case BulkActionType.ADD_ALL_MISSING:
        await handleAddAllMissing();
        break;
      case BulkActionType.ADD_ALL:
        await handleAddAll();
        break;
      case BulkActionType.SEARCH_ALL:
        await handleSearchAll();
        break;
    }
  };

  const handleAddAllMissing = async () => {
    const confirmed = window.confirm(
      'This will search StashDB and Whisparr to find ALL missing scenes from the current context (studio/performer/page). ' +
        'This operation may take several minutes and will query both APIs extensively. Continue?',
    );

    if (!confirmed) return;

    try {
      const results = await SceneService.addAllMissingScenes(store);
      ToastService.showToast(
        `Add All Missing completed: ${results.totalAdded} scenes added, ${results.failed.length} failed`,
        results.failed.length === 0,
      );
    } catch (error) {
      console.error('Add All Missing failed:', error);
      ToastService.showToast('Add All Missing operation failed', false);
    }
  };

  const handleAddAll = async () => {
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
      ToastService.showToast(
        `Added ${sceneMap.size} new scenes to Whisparr from page ${pageNumber + 1}.`,
        true,
      );
      rehydrateSceneCards(store, sceneMap);
    } catch (error) {
      console.error('Add All failed:', error);
      ToastService.showToast('Add All operation failed', false);
    }
  };

  const handleSearchAll = async () => {
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
      ToastService.showToast(
        `Triggered search for ${stashIds.length} existing scenes on page ${pageNumber + 1}.`,
        true,
      );
    } catch (error) {
      console.error('Search All failed:', error);
      ToastService.showToast('Search All operation failed', false);
    }
  };

  const getActionDetails = (actionType: BulkActionType) => {
    switch (actionType) {
      case BulkActionType.ADD_ALL:
        return {
          icon: 'fa-solid fa-download',
          label: 'Add All',
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
      case BulkActionType.SEARCH_ALL:
        return {
          icon: 'fa-solid fa-search',
          label: 'Search All',
          description: 'Search all monitored scenes on this page in Whisparr',
          className: 'text-warning',
        };
    }
  };

  return (
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
            BulkActionType.ADD_ALL,
            BulkActionType.ADD_ALL_MISSING,
            BulkActionType.SEARCH_ALL,
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
  );
};

export default BulkActionDropdown;
