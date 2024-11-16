import { icon } from '@fortawesome/fontawesome-svg-core';
import { Stasharr } from '../enums/Stasharr';
import { StashDB } from '../enums/StashDB';
import { Config } from '../models/Config';
import {
  faBookmark as faBookmarkSolid,
  faExclamationTriangle,
  faPlusCircle,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { faBookmark as faBookmarkEmpty } from '@fortawesome/free-regular-svg-icons';
import {
  addTooltip,
  extractStashIdFromPath,
  removeTooltip,
  responseStatusCodeOK,
} from '../util/util';
import { Whisparr } from '../types/whisparr';
import ToastService from '../service/ToastService';
import { isNull } from 'lodash';
import PerformerService from '../service/PerformerService';
import { Styles } from '../enums/Styles';

export class PerformerController {
  static initialize(config: Config) {
    const performerStashId = extractStashIdFromPath();
    if (config.whisparrApiKey == '' || performerStashId == null) return;

    const performerTitle = document.querySelector(
      StashDB.DOMSelector.PerformerCardHeader,
    );

    if (performerTitle) {
      const performerMonitorButton = document.querySelector<HTMLElement>(
        Stasharr.DOMSelector.PerformerMonitor,
      );
      if (isNull(performerMonitorButton)) {
        PerformerService.getPerformerByStashId(config, performerStashId).then(
          (performerDetails) => {
            if (performerDetails) {
              performerTitle.append(
                PerformerController.initMonitorButton(config, performerDetails),
              );
            } else {
              const performerName =
                performerTitle.querySelector<HTMLSpanElement>(
                  'span',
                )?.innerText;
              performerTitle.append(
                PerformerController.initAddPerformerButton(
                  config,
                  performerStashId,
                  performerName || 'performer',
                ),
              );
            }
          },
        );
      }
    }
  }

  private static initAddPerformerButton(
    config: Config,
    stashId: string,
    name: string,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = Stasharr.ID.PerformerAdd;
    button.type = 'button';
    button.classList.add('FavoriteStar', 'ps-2', 'btn', 'btn-link');
    button.innerHTML = `${icon(faPlusCircle).html}`;
    button.style.cssText = Styles.AddPerformerButton;
    addTooltip(button, `Add ${name} to Whisparr`);
    button.addEventListener('click', () => {
      PerformerController.addPerformer(config, button, stashId, name);
    });
    return button;
  }

  private static addPerformer(
    config: Config,
    addPerformerButton: HTMLButtonElement,
    stashId: string,
    name: string,
  ): void {
    PerformerController.updateAddPerformerButtonToLoading(addPerformerButton);
    PerformerService.addPerformer(config, stashId).then((response) => {
      if (!responseStatusCodeOK(response.status)) {
        ToastService.showToast(
          'An error occurred while adding the performer to Whisparr.',
          false,
        );
        console.error(response.response);
        addPerformerButton.innerHTML = `${icon(faExclamationTriangle).html}`;
        return;
      }
      ToastService.showToast(`Successfully added ${name} to Whisparr.`, true);
      removeTooltip(addPerformerButton);
      addPerformerButton.remove();
      PerformerController.initialize(config);
    });
  }

  private static updateAddPerformerButtonToLoading(
    button: HTMLButtonElement,
  ): void {
    button.innerHTML = `${icon(faSpinner, { classes: ['fa-spin'] }).html}`;
    button.style.cssText = Styles.AddPerformerButtonLoading;
    button.disabled = true;
  }

  private static initMonitorButton(
    config: Config,
    performer: Whisparr.WhisparrPerformer,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = Stasharr.ID.PerformerMonitor;
    button.type = 'button';
    button.classList.add('FavoriteStar', 'ps-2', 'btn', 'btn-link');
    PerformerController.updateMonitorButton(button, performer);
    button.addEventListener('click', () => {
      PerformerController.toggleMonitor(config, button, performer);
    });
    return button;
  }

  private static updateMonitorButton(
    button: HTMLButtonElement,
    performer: Whisparr.WhisparrPerformer,
  ): void {
    if (performer.monitored) {
      button.innerHTML = `${icon(faBookmarkSolid).html}`;
      addTooltip(button, `Unmonitor ${performer.fullName} in Whisparr`);
    } else {
      button.innerHTML = `${icon(faBookmarkEmpty).html}`;
      addTooltip(button, `Monitor ${performer.fullName} in Whisparr`);
    }
  }

  private static toggleMonitor(
    config: Config,
    button: HTMLButtonElement,
    performer: Whisparr.WhisparrPerformer,
  ): void {
    performer.monitored = !performer.monitored;
    PerformerService.updatePerformer(config, performer).then(
      (updatedPerformer) => {
        PerformerController.updateMonitorButton(button, updatedPerformer);
        if (updatedPerformer.monitored) {
          ToastService.showToast(
            `Monitoring ${updatedPerformer.fullName} in Whisparr`,
          );
        } else {
          ToastService.showToast(
            `Unmonitored ${updatedPerformer.fullName} in Whisparr`,
          );
        }
      },
    );
  }
}
