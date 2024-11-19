import { createResource, Match, Switch } from 'solid-js';
import { Config } from '../models/Config';
import PerformerService from '../service/PerformerService';
import { Stasharr } from '../enums/Stasharr';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faBookmark, faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as faBookmarkEmpty } from '@fortawesome/free-regular-svg-icons';
import { Whisparr } from '../types/whisparr';

function Performer(props: { config: Config; stashId: string }) {
  const [performerDetails, { refetch }] = createResource(
    props,
    async (p: { config: Config; stashId: string }) => {
      const response = await PerformerService.getPerformerByStashId(
        p.config,
        p.stashId,
      );
      return response;
    },
  );

  const addPerformer = async () => {
    await PerformerService.addPerformer(props.config, props.stashId);
    refetch();
  };

  const toggleMonitor = async (performer: Whisparr.WhisparrPerformer) => {
    performer.monitored = !performer.monitored;
    await PerformerService.updatePerformer(props.config, performer);
    refetch();
  };

  return (
    <>
      <Switch>
        <Match when={performerDetails() === null}>
          <button
            class="FavoriteStar ps-2 btn btn-link stasharr-performer-add"
            type="button"
            id={Stasharr.ID.PerformerAdd}
            onclick={addPerformer}
          >
            <span innerHTML={icon(faCirclePlus).html[0]}></span>
          </button>
        </Match>
        <Match when={performerDetails()}>
          <button
            class="FavoriteStar ps-2 btn btn-link"
            type="button"
            id={Stasharr.ID.PerformerMonitor}
            onclick={() => toggleMonitor(performerDetails()!)}
          >
            <span
              innerHTML={
                icon(
                  performerDetails()?.monitored ? faBookmark : faBookmarkEmpty,
                ).html[0]
              }
            ></span>
          </button>
        </Match>
      </Switch>
    </>
  );
}

export default Performer;
