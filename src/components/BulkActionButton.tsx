import { icon } from '@fortawesome/fontawesome-svg-core';
import { Stasharr } from '../enums/Stasharr';
import { Config } from '../models/Config';
import { faSearch, faDownload } from '@fortawesome/free-solid-svg-icons';
import { parseInt } from 'lodash';
import { StashDB } from '../enums/StashDB';
import { StashIdToSceneCardAndStatusMap } from '../types/stasharr';
import {
  extractStashIdFromSceneCard,
  rehydrateSceneCards,
  tooltips,
} from '../util/util';
import { SceneStatus, SceneStatusType } from '../enums/SceneStatus';
import SceneService from '../service/SceneService';
import ToastService from '../service/ToastService';
import { createEffect } from 'solid-js';
import { Tooltip } from 'bootstrap';

type BulkActionButtonProps = {
  config: Config;
  actionType: 'search' | 'add';
};

function BulkActionButton({ config, actionType }: BulkActionButtonProps) {
  const getButtonDetails = () => {
    if (actionType === 'search') {
      return {
        icon: faSearch,
        className: 'stasharr-button stasharr-button-searchable',
        id: Stasharr.ID.SearchAllExisting,
        sceneStatus: SceneStatus.EXISTS_AND_NO_FILE,
        searchAction: SceneService.triggerWhisparrSearchAll,
        successMessage: 'Triggered search for all',
      };
    }
    return {
      icon: faDownload,
      className: 'stasharr-button stasharr-button-add',
      id: Stasharr.ID.AddAllAvailable,
      sceneStatus: SceneStatus.NOT_IN_WHISPARR,
      addAction: SceneService.lookupAndAddAll,
      successMessage: 'Added',
    };
  };

  const clickHandler = async () => {
    const details = getButtonDetails();
    const pageNumber: number = parseInt(
      document
        .querySelector<HTMLElement>(StashDB.DOMSelector.DataPage)
        ?.getAttribute(StashDB.DataAttribute.DataPage) || '{Page not found}',
    );

    const stashIdtoSceneCardAndStatusMap: StashIdToSceneCardAndStatusMap =
      new Map();
    const sceneCards = document.querySelectorAll<HTMLElement>(
      Stasharr.DOMSelector.SceneCardByButtonStatus(details.sceneStatus),
    );

    sceneCards.forEach((node) => {
      const stashId = extractStashIdFromSceneCard(node);
      if (stashId) {
        const sceneStatusNumber =
          parseInt(
            node
              .querySelector('.stasharr-card-button')
              ?.getAttribute(Stasharr.DataAttribute.SceneStatus) || '',
            10,
          ) || -1;

        if (sceneStatusNumber > -1) {
          stashIdtoSceneCardAndStatusMap.set(stashId, {
            status: sceneStatusNumber as SceneStatusType,
            sceneCard: node,
          });
        }
      }
    });

    if (actionType === 'search' && details.searchAction) {
      await details.searchAction(
        config,
        Array.from(stashIdtoSceneCardAndStatusMap.keys()),
      );
      ToastService.showToast(
        `${details.successMessage} ${stashIdtoSceneCardAndStatusMap.size} existing scenes on page ${
          pageNumber + 1
        }.`,
        true,
      );
    } else if (details.addAction) {
      const sceneMap = await details.addAction(
        config,
        stashIdtoSceneCardAndStatusMap,
      );
      ToastService.showToast(
        `${details.successMessage} ${sceneMap.size} new scenes to Whisparr from page ${
          pageNumber + 1
        }.`,
        true,
      );
      rehydrateSceneCards(config, sceneMap);
    }
  };

  const details = getButtonDetails();

  createEffect(() => {
    tooltips();
  });

  return (
    <div class="ms-3 mb-2">
      <button
        type="button"
        class={details.className}
        id={details.id}
        onclick={clickHandler}
        data-bs-toggle="tooltip"
        data-bs-title={
          actionType === 'search'
            ? 'Search all available scenes on this page in Whisparr.'
            : 'Add all available scenes on this page to Whisparr.'
        }
      >
        <span innerHTML={icon(details.icon).html[0]}></span>{' '}
        {actionType === 'search' ? 'Search All' : 'Add All'}
      </button>
    </div>
  );
}

export default BulkActionButton;
