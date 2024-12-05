import { createMemo, createResource, For } from 'solid-js';
import { useSettings } from '../../../contexts/useSettings';
import { Form } from 'solid-bootstrap';
import { Stasharr } from '../../../enums/Stasharr';
import { ReactiveStoreFactory } from '../../../factory/ReactiveStoreFactory';
import WhisparrService from '../../../service/WhisparrService';

const RootFolderPathSelect = () => {
  const { store, setStore } = useSettings();

  const reactiveStore = createMemo(
    ReactiveStoreFactory.createReactiveStore(store),
  );

  const [rootFolderPaths] = createResource(reactiveStore, async (s) => {
    if (!s.basicValidation()) return [];
    return (await WhisparrService.rootFolderPaths(s)) || [];
  });

  const handleRootFolderPathChange = (value: string) => {
    setStore('rootFolderPath', value === 'invalid' ? '' : value);
  };

  return (
    <div class="input-group mb-3">
      <label class="input-group-text">Root Folder Path</label>
      <Form.Select
        aria-label="Root Folder Path select"
        onChange={(e) => handleRootFolderPathChange(e.target.value)}
        value={store.rootFolderPath}
        id={Stasharr.ID.Modal.RootFolderPath}
      >
        <option value="invalid">Select the Root Folder Path...</option>
        <For each={rootFolderPaths()}>
          {(rootFolderPath) => (
            <option
              selected={store.rootFolderPath === rootFolderPath.path}
              value={rootFolderPath.path}
            >
              {rootFolderPath.path}
            </option>
          )}
        </For>
      </Form.Select>
    </div>
  );
};

export default RootFolderPathSelect;
