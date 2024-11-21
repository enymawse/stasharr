import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  ErrorBoundary,
  Show,
} from 'solid-js';
import { Modal, Button, Alert } from 'solid-bootstrap';
import ProtocolSwitch from './ProtocolSwitch';
import DomainInput from './DomainInput';
import WhisparrApiKeyInput from './ApiKeyInput';
import { createStore } from 'solid-js/store';
import { Config } from '../models/Config';
import WhisparrService from '../service/WhisparrService';
import { SettingsContext, useSettings } from '../contexts/useSettings';
import QualityProfileSelect from './QualityProfile';
import { parseInt } from 'lodash';
import RootFolderPathSelect from './RootFolderPath';

function SettingsModal(props: { config: Config }) {
  const [show, setShow] = createSignal(false);
  const handleOpen = () => setShow(true);
  const handleClose = () => setShow(false);

  const [store, setStore] = createStore(props.config);

  const storeSubset = createMemo(() => ({
    protocol: store.protocol,
    domain: store.domain,
    whisparrApiKey: store.whisparrApiKey,
  }));

  const [systemStatus, { refetch: refetchSystemStatus }] = createResource(
    storeSubset,
    async ({ protocol, domain, whisparrApiKey }) => {
      return await WhisparrService.systemStatus(
        new Config({ protocol, domain, whisparrApiKey }),
      );
    },
  );

  const [qualityProfiles] = createResource(
    storeSubset,
    async ({ protocol, domain, whisparrApiKey }) => {
      if (!domain || !whisparrApiKey) return [];
      const response = await WhisparrService.qualityProfiles(
        new Config({ protocol, domain, whisparrApiKey }),
      );
      return response || [];
    },
  );

  const [rootFolderPaths] = createResource(
    storeSubset,
    async ({ protocol, domain, whisparrApiKey }) => {
      if (!domain || !whisparrApiKey) return [];
      const response = await WhisparrService.rootFolderPaths(
        new Config({ protocol, domain, whisparrApiKey }),
      );
      return response || [];
    },
  );

  const version = createMemo(() => {
    const status = systemStatus();
    if (status) {
      return parseInt(status.version.split('.')[0]);
    } else {
      return 99;
    }
  });

  return (
    <SettingsContext.Provider value={{ store, setStore }}>
      <a class="nav-link" data-bs-toggle="modal" onclick={handleOpen} href="#">
        Stasharr
      </a>
      <Modal show={show()} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Stasharr Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Show when={version() < 3}>
            <Alert variant="danger">
              Stasharr has been purpose built to work with Whisparr's V3 API.
              Please consult{' '}
              <a href="https://wiki.servarr.com/whisparr">Whisparr's Wiki</a> or
              head over to the{' '}
              <a href="https://whisparr.com/discord">discord</a> server for more
              details.
            </Alert>
          </Show>
          <ProtocolSwitch />
          <DomainInput />
          <WhisparrApiKeyInput />
          <Show when={systemStatus()}>
            <QualityProfileSelect qualityProfiles={qualityProfiles()} />
            <RootFolderPathSelect rootFolderPaths={rootFolderPaths()} />
          </Show>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={!store.valid()}
            onClick={handleClose}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </SettingsContext.Provider>
  );
}

export default SettingsModal;
