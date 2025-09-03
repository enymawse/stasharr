import { Config } from '../../models/Config';
import StashServiceBase from './StashServiceBase';
import { StashScene, StashStats } from '../../types/stash';

export default class StashSceneService extends StashServiceBase {
  public static async stats(config: Config): Promise<StashStats> {
    const query = `
        query Stats {
            stats {
                scene_count
                scenes_size
                scenes_duration
                image_count
                images_size
                gallery_count
                performer_count
                studio_count
                group_count
                movie_count
                tag_count
                total_o_count
                total_play_duration
                total_play_count
                scenes_played
            }
        }`;
    const request = StashServiceBase.request(config, { query });
    return request.then((res) => res.data as StashStats);
  }

  public static async getSceneByStashId(
    config: Config,
    stashId: string,
  ): Promise<StashScene> {
    const variables = { stashId };
    const query = `
        query customFindByStashId($stashId: String) {
            findScenes(
                scene_filter: {
                    stash_id_endpoint: {
                        stash_id: $stashId
                        modifier: EQUALS
                    }
                }
            ) {
                scenes {
                    id
                    title
                    code
                    details
                    director
                    url
                    urls
                    date
                    rating100
                    organized
                    o_counter
                    interactive
                    interactive_speed
                    created_at
                    updated_at
                    last_played_at
                    resume_time
                    play_duration
                    play_count
                    play_history
                    o_history
                }
            }
        }`;
    const request = StashServiceBase.request(config, { query, variables });
    return request.then(
      (res) => res?.data?.findScenes?.scenes[0] as StashScene,
    );
  }

  public static async deleteSceneById(
    config: Config,
    id: string,
    options?: { deleteFile?: boolean; deleteGenerated?: boolean },
  ): Promise<boolean> {
    const variables = {
      ids: [id],
      deleteFile: options?.deleteFile ?? false,
      deleteGenerated: options?.deleteGenerated ?? false,
    };
    const query = `
      mutation SceneDestroy($ids: [ID!]!, $deleteFile: Boolean!, $deleteGenerated: Boolean!) {
        sceneDestroy(input: { ids: $ids, delete_file: $deleteFile, delete_generated: $deleteGenerated })
      }`;
    const request = StashServiceBase.request(config, { query, variables });
    return request
      .then((res) => Boolean(res?.data?.sceneDestroy))
      .catch((e) => {
        console.error('Stash scene delete failed', e);
        return false;
      });
  }

  public static async deleteSceneByStashId(
    config: Config,
    stashId: string,
    options?: { deleteFile?: boolean; deleteGenerated?: boolean },
  ): Promise<boolean> {
    const scene = await this.getSceneByStashId(config, stashId);
    if (!scene?.id) return false;
    return this.deleteSceneById(config, scene.id, options);
  }
}
