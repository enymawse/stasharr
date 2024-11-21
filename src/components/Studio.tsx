import { createEffect, createResource, Match, Switch } from 'solid-js';
import { Config } from '../models/Config';
import StudioService from '../service/StudioService';
import { Stasharr } from '../enums/Stasharr';
import { faBookmark, faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as faBookmarkEmpty } from '@fortawesome/free-regular-svg-icons';
import { Whisparr } from '../types/whisparr';
import { tooltips } from '../util/util';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';

library.add(faCirclePlus, faBookmark, faBookmarkEmpty);

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

  createEffect(() => {
    if (studioDetails()) tooltips();
  });

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
            <FontAwesomeIcon icon="fa-solid fa-circle-plus" />
          </button>
        </Match>
        <Match when={studioDetails()}>
          <button
            class="FavoriteStar ps-2 btn btn-link"
            type="button"
            id={Stasharr.ID.StudioMonitor}
            onclick={() => toggleMonitor(studioDetails()!)}
            data-bs-toggle="tooltip"
            data-bs-title={`${studioDetails()?.monitored ? 'Unmonitor' : 'Monitor'} ${studioDetails()?.title} in Whisparr`}
          >
            <FontAwesomeIcon
              icon={
                studioDetails()?.monitored
                  ? 'fa-solid fa-bookmark'
                  : 'fa-regular fa-bookmark'
              }
            />
          </button>
        </Match>
      </Switch>
    </>
  );
}

export default Studio;
