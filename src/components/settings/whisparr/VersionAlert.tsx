import { createMemo, createResource, Show } from 'solid-js';
import { useSettings } from '../../../contexts/useSettings';
import { ReactiveStoreFactory } from '../../../factory/ReactiveStoreFactory';
import { Alert } from 'solid-bootstrap';
import WhisparrService from '../../../service/WhisparrService';

const VersionAlert = () => {
  const { store } = useSettings();

  const reactiveStore = createMemo(
    ReactiveStoreFactory.createReactiveStore(store),
  );

  const [systemStatus] = createResource(reactiveStore, async (s) => {
    return await WhisparrService.systemStatus(s);
  });

  const version = createMemo(() => {
    const status = systemStatus();
    if (status) {
      return parseInt(status.version.split('.')[0]);
    } else {
      return 99;
    }
  });

  return (
    <Show when={version() < 3}>
      <Alert variant="danger">
        Stasharr has been purpose built to work with Whisparr's V3 API. Please
        consult <a href="https://wiki.servarr.com/whisparr">Whisparr's Wiki</a>{' '}
        or head over to the <a href="https://whisparr.com/discord">discord</a>{' '}
        server for more details.
      </Alert>
    </Show>
  );
};

export default VersionAlert;
