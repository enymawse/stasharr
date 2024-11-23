import { createStore } from 'solid-js/store';
import { SettingsContext } from '../contexts/useSettings';
import { Config } from '../models/Config';
import BulkActionButton from './BulkActionButton';

const SceneList = (props: { config: Config }) => {
  const [store, setStore] = createStore(props.config);
  return (
    <SettingsContext.Provider value={{ store, setStore }}>
      <div class="d-flex justify-content-end">
        <BulkActionButton actionType="add" />
        <BulkActionButton actionType="search" />
      </div>
    </SettingsContext.Provider>
  );
};

export default SceneList;
