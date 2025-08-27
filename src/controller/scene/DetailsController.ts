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
  private detailsDispose?: () => void;
  private headerButtonDispose?: () => void;
  private floatingCopyButtonDispose?: () => void;

  initialize(): void {
    const details = document.querySelector(Stasharr.DOMSelector.HeaderDetails);
    const floatEnd = document.querySelector(
      StashDB.DOMSelector.SceneInfoCardHeaderFloatEnd,
    );
    const stashId = extractStashIdFromPath();
    if (floatEnd !== null && stashId !== null && details === null) {
      if (!this.detailsDispose) {
        this.detailsDispose = render(
          () => Details({ config: this._config, stashId: stashId }),
          floatEnd,
        );
      }
    }
    const headerButton = document.querySelector(
      Stasharr.DOMSelector.HeaderButton,
    );
    const cardHeader: HTMLElement | null = document.querySelector<HTMLElement>(
      StashDB.DOMSelector.SceneInfoCardHeader,
    );
    if (headerButton === null && stashId !== null && cardHeader !== null) {
      if (!this.headerButtonDispose) {
        this.headerButtonDispose = render(
          () =>
            SceneButton({
              config: this._config,
              stashId: stashId,
              header: true,
            }),
          cardHeader,
        );
      }
    }

    const floatingCopyButton = document.querySelector(
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
  shouldReinit(): boolean {
    const details = document.querySelector(Stasharr.DOMSelector.HeaderDetails);
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
    if (details === null && this.detailsDispose) {
      this.detailsDispose();
      this.detailsDispose = undefined;
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
      (details === null || headerButton === null || floatingCopyButton === null)
    ) {
      console.log('shouldReinit - DetailsController');
      return true;
    }
    return false;
  }
  cleanup(): void {
    if (this.detailsDispose) {
      this.detailsDispose();
      this.detailsDispose = undefined;
    }
    if (this.headerButtonDispose) {
      this.headerButtonDispose();
      this.headerButtonDispose = undefined;
    }
    if (this.floatingCopyButtonDispose) {
      this.floatingCopyButtonDispose();
      this.floatingCopyButtonDispose = undefined;
    }
  }

  constructor(private _config: Config) {
    super(new DetailsMutationHandler());
  }
}
