import { createResource, Match, Switch } from 'solid-js';
import { Config } from '../models/Config';
import StudioService from '../service/StudioService';
import { Stasharr } from '../enums/Stasharr';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faBookmark, faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as faBookmarkEmpty } from '@fortawesome/free-regular-svg-icons';
import { Whisparr } from '../types/whisparr';

function Studio(props: { config: Config; stashId: string }) {
  const [studioDetails, { refetch }] = createResource(
    props,
    async (p: { config: Config; stashId: string }) => {
      const response = await StudioService.getStudioByStashId(
        p.config,
        p.stashId,
      );
      return response;
    },
  );

  const addStudio = async () => {
    await StudioService.addStudio(props.config, props.stashId);
    refetch();
  };

  const toggleMonitor = async (studio: Whisparr.WhisparrStudio) => {
    studio.monitored = !studio.monitored;
    await StudioService.updateStudio(props.config, studio);
    refetch();
  };

  return (
    <>
      <Switch>
        <Match when={studioDetails() === null}>
          <button
            class="FavoriteStar ps-2 btn btn-link stasharr-studio-add"
            type="button"
            id={Stasharr.ID.StudioAdd}
            onclick={addStudio}
          >
            <span innerHTML={icon(faCirclePlus).html[0]}></span>
          </button>
        </Match>
        <Match when={studioDetails()}>
          <button
            class="FavoriteStar ps-2 btn btn-link"
            type="button"
            id={Stasharr.ID.StudioMonitor}
            onclick={() => toggleMonitor(studioDetails()!)}
          >
            <span
              innerHTML={
                icon(studioDetails()?.monitored ? faBookmark : faBookmarkEmpty)
                  .html[0]
              }
            ></span>
          </button>
        </Match>
      </Switch>
    </>
  );
}

export default Studio;
