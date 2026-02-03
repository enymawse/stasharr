import { Form } from 'solid-bootstrap';
import { useSettings } from '../../../contexts/useSettings';
import { Stasharr } from '../../../enums/Stasharr';
import { createMemo, createResource, For } from 'solid-js';
import WhisparrService from '../../../service/WhisparrService';
import { parseInt } from 'lodash';
import { ReactiveStoreFactory } from '../../../factory/ReactiveStoreFactory';

const Tags = () => {
  const { store, setStore } = useSettings();

  const reactiveStore = createMemo(
    ReactiveStoreFactory.createReactiveStore(store),
  );

  const [tags] = createResource(reactiveStore, async (s) => {
    if (!s.domain || !s.whisparrApiKey) return [];
    return WhisparrService.tags(s) || [];
  });

  const handleTagsChange = (
    // eslint-disable-next-line no-undef
    selectedOptions: HTMLCollectionOf<HTMLOptionElement>,
  ) => {
    if (selectedOptions.length === 0) setStore('tags', []);
    let tags: number[] = [];
    for (let i = 0; i < selectedOptions.length; i++) {
      const option = selectedOptions.item(i);
      if (option) tags.push(parseInt(option.value, 10));
    }
    setStore('tags', tags);
  };
  return (
    <div class="input-group mb-3">
      <label class="input-group-text">Tags</label>
      <Form.Select
        aria-label="Tags select"
        multiple={true}
        onChange={(e) => handleTagsChange(e.target.selectedOptions)}
        id={Stasharr.ID.Modal.Tags}
        data-bs-toggle="tooltip"
        data-bs-title="Enter tags to be associated with the scenes, studios, and performers added via Stasharr."
      >
        <For each={tags()}>
          {(tag) => (
            <option
              value={tag.id}
              selected={store.tags.filter((t) => t === tag.id).length > 0}
            >
              {tag.label}
            </option>
          )}
        </For>
      </Form.Select>
    </div>
  );
};

export default Tags;
