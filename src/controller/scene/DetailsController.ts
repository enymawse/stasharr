import { render } from 'solid-js/web';
import { Stasharr } from '../../enums/Stasharr';
import { StashDB } from '../../enums/StashDB';
import { Config } from '../../models/Config';
import { DetailsMutationHandler } from '../../mutation-handlers/scene/DetailsMutationHandler';
import { BaseController } from '../BaseController';
import Details from '../../components/scene/header/Details';
import { extractStashIdFromPath } from '../../util/util';
import SceneButton from '../../components/SceneButton';
import FloatingCopyButton from '../../components/FloatingCopyButton';

export class DetailsController extends BaseController {
  private sceneDetailsDispose?: () => void;
  private headerButtonDispose?: () => void;
  private floatingCopyButtonDispose?: () => void;

  initialize(): void {
    const stashId = extractStashIdFromPath();
    const headerButton = document.querySelector(
      Stasharr.DOMSelector.HeaderButton,
    );
    const sceneInfoCardHeader = document.querySelector<HTMLElement>(
      StashDB.DOMSelector.SceneInfoCardHeader,
    );
    if (
      headerButton === null &&
      stashId !== null &&
      sceneInfoCardHeader !== null
    ) {
      if (!this.headerButtonDispose) {
        this.headerButtonDispose = render(
          () =>
            SceneButton({
              config: this._config,
              stashId: stashId,
              header: true,
            }),
          sceneInfoCardHeader,
        );
      }
    }

    const sceneDetails = document.querySelector(
      Stasharr.DOMSelector.SceneDetails,
    );
    const sceneInfoCardHeaderH6 = document.querySelector<HTMLElement>(
      StashDB.DOMSelector.SceneInfoCardHeaderH6,
    );
    if (
      sceneDetails === null &&
      stashId !== null &&
      sceneInfoCardHeaderH6 !== null
    ) {
      if (!this.sceneDetailsDispose) {
        this.sceneDetailsDispose = render(
          () =>
            Details({
              config: this._config,
              stashId: stashId,
            }),
          sceneInfoCardHeaderH6.appendChild(document.createElement('div')),
        );
      }
    }

    const floatingCopyButton = document.querySelector<HTMLElement>(
      Stasharr.DOMSelector.FloatingCopyButton,
    );
    if (floatingCopyButton === null && stashId !== null) {
      if (!this.floatingCopyButtonDispose) {
        this.floatingCopyButtonDispose = render(
          () => FloatingCopyButton({ textToCopy: stashId }),
          document.body,
        );
      }
    }
  }
  shouldReinit(node: HTMLElement): boolean {
    const sceneDetails = document.querySelector(
      Stasharr.DOMSelector.SceneDetails,
    );
    const headerButton = document.querySelector(
      Stasharr.DOMSelector.HeaderButton,
    );
    const floatingCopyButton = document.querySelector(
      Stasharr.DOMSelector.FloatingCopyButton,
    );
    const sceneInfoCardHeader = document.querySelector(
      StashDB.DOMSelector.SceneInfoCardHeader,
    );

    // Reset dispose functions if elements are missing (page navigation/refresh)
    if (sceneDetails === null && this.sceneDetailsDispose) {
      this.sceneDetailsDispose();
      this.sceneDetailsDispose = undefined;
    }
    if (headerButton === null && this.headerButtonDispose) {
      this.headerButtonDispose();
      this.headerButtonDispose = undefined;
    }
    if (floatingCopyButton === null && this.floatingCopyButtonDispose) {
      this.floatingCopyButtonDispose();
      this.floatingCopyButtonDispose = undefined;
    }

    if (
      sceneInfoCardHeader &&
      (sceneDetails === null ||
        headerButton === null ||
        floatingCopyButton === null)
    ) {
      console.log('shouldReinit - DetailsController');
      return true;
    }
    return false;
  }
  cleanup(): void {
    if (this.sceneDetailsDispose) {
      this.sceneDetailsDispose();
      this.sceneDetailsDispose = undefined;
    }
    if (this.headerButtonDispose) {
      this.headerButtonDispose();
      this.headerButtonDispose = undefined;
    }
    if (this.floatingCopyButtonDispose) {
      this.floatingCopyButtonDispose();
      this.floatingCopyButtonDispose = undefined;
    }
    this.cleanupTooltips();
  }

  constructor(private _config: Config) {
    super(new DetailsMutationHandler());
  }
}
