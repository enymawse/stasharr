import { Alert, Button } from 'solid-bootstrap';
import { useSettings } from '../../../contexts/useSettings';
import { createMemo, createSignal } from 'solid-js';
import { ReactiveStoreFactory } from '../../../factory/ReactiveStoreFactory';
import StashServiceBase from '../../../service/stash/StashServiceBase';

const TestStashSettings = () => {
  const { store } = useSettings();

  const reactiveStore = createMemo(
    ReactiveStoreFactory.createStashReactiveStore(store),
  );

  const handleTest = () => {
    if (reactiveStore().stashValid()) {
      const systemStatus = StashServiceBase.systemStatus(reactiveStore());
      systemStatus.then((status) => {
        setShowSuccess(status);
        setShowWarning(!status);
      });
    }
  };

  const [showSuccess, setShowSuccess] = createSignal(false);
  const [showWarning, setShowWarning] = createSignal(false);

  return (
    <>
      <Alert
        variant="success"
        dismissible
        show={showSuccess()}
        onClose={() => setShowSuccess(false)}
      >
        Connection to Stash established.
      </Alert>
      <Alert
        variant="warning"
        dismissible
        show={showWarning()}
        onClose={() => setShowWarning(false)}
      >
        Connection to Stash unsuccessful. Check settings.
      </Alert>
      <Button onclick={handleTest}>Test</Button>
    </>
  );
};

export default TestStashSettings;
