import { Config } from '../models/Config';
import { render } from 'solid-js/web';
import { BaseController } from './BaseController';
import { SceneListMutationHandler } from '../mutation-handlers/SceneListMutationHandler';
import SceneList from '../components/SceneList';

export class ScenesListController extends BaseController {
  constructor(private _config: Config) {
    super(new SceneListMutationHandler());
  }

  shouldReinit(node: HTMLElement): boolean {
    return node.matches('.row');
  }

  initialize() {
    console.log('ScenesListController: initialize() called');
    console.log('Current URL:', window.location.href);
    console.log(
      'Whisparr basic configuration valid:',
      this._config.basicValidation(),
    );

    if (this._config.basicValidation() && this.isOnTargetPath()) {
      const sceneListCommandRow =
        document.querySelector<HTMLDivElement>('.scenes-list');

      console.log(
        'ScenesListController: sceneListCommandRow found:',
        !!sceneListCommandRow,
      );

      if (sceneListCommandRow) {
        console.log('ScenesListController: .scenes-list element details:');
        console.log(
          '  - innerHTML length:',
          sceneListCommandRow.innerHTML.length,
        );
        console.log('  - children count:', sceneListCommandRow.children.length);
        console.log(
          '  - first child tag:',
          sceneListCommandRow.firstChild?.nodeName,
        );

        const existingStasharrActions = document.querySelector(
          '#stasharr-actions-dropdown',
        );
        const existingStasharrButtons =
          sceneListCommandRow.querySelectorAll('.stasharr-button');

        console.log(
          'ScenesListController: existing actions dropdown:',
          !!existingStasharrActions,
        );
        console.log(
          'ScenesListController: existing stasharr buttons count:',
          existingStasharrButtons.length,
        );

        if (!existingStasharrActions && existingStasharrButtons.length === 0) {
          console.log('ScenesListController: Adding new SceneList component');
          const placeholder = document.createElement('div');
          placeholder.id = 'stasharr-scene-list-placeholder';
          sceneListCommandRow.insertBefore(
            placeholder,
            sceneListCommandRow.firstChild,
          );
          console.log(
            'ScenesListController: Placeholder added, rendering SceneList...',
          );
          render(() => SceneList({ config: this._config }), placeholder);
          console.log('ScenesListController: SceneList render complete');
        } else {
          console.log(
            'ScenesListController: Skipped - Stasharr elements already exist',
          );
        }
      } else {
        console.log('ScenesListController: No .scenes-list container found');
        const sceneElements = document.querySelectorAll('[class*="scene"]');
        console.log(
          'ScenesListController: Found scene-related elements:',
          sceneElements.length,
        );
        sceneElements.forEach((el, i) => {
          if (i < 5) {
            console.log(
              `  - ${el.tagName}.${Array.from(el.classList).join('.')}`,
            );
          }
        });
      }
    } else {
      console.log(
        'ScenesListController: Skipped - Whisparr is not configured yet',
      );
    }
  }
}
