import { For } from 'solid-js';
import { useSettings } from '../../contexts/useSettings';
import { Form } from 'solid-bootstrap';
import { Whisparr } from '../../types/whisparr';
import { Stasharr } from '../../enums/Stasharr';

const RootFolderPathSelect = (props: {
  rootFolderPaths: Whisparr.RootFolder[] | undefined;
}) => {
  const { store, setStore } = useSettings();

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
        <For each={props.rootFolderPaths}>
          {(rootFolderPath) => (
            <option value={rootFolderPath.path}>{rootFolderPath.path}</option>
          )}
        </For>
      </Form.Select>
    </div>
  );
};

export default RootFolderPathSelect;
