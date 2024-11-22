import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
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
import SearchOnAddSelect from './SearchOnAdd';
import { Stasharr } from '../enums/Stasharr';
import StashInstance from './StashInstance';

function SettingsModal(props: { config: Config }) {
  const [show, setShow] = createSignal(false);
  const handleOpen = () => setShow(true);
  const handleClose = () => setShow(false);

  const handleSave = () => {
    store.save();
    setShow(false);
    window.location.reload();
  };

  const [store, setStore] = createStore(props.config);

  const storeSubset = createMemo(() => ({
    protocol: store.protocol,
    domain: store.domain,
    whisparrApiKey: store.whisparrApiKey,
  }));

  const [systemStatus] = createResource(
    storeSubset,
    async ({ protocol, domain, whisparrApiKey }) => {
      return await WhisparrService.systemStatus(store);
    },
  );

  const [qualityProfiles] = createResource(
    storeSubset,
    async ({ protocol, domain, whisparrApiKey }) => {
      if (!domain || !whisparrApiKey) return [];
      const response = await WhisparrService.qualityProfiles(store);
      return response || [];
    },
  );

  const [rootFolderPaths] = createResource(
    storeSubset,
    async ({ protocol, domain, whisparrApiKey }) => {
      if (!domain || !whisparrApiKey) return [];
      const response = await WhisparrService.rootFolderPaths(store);
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

  createEffect(() => {
    GM_registerMenuCommand('Settings', handleOpen);
  });

  return (
    <SettingsContext.Provider value={{ store, setStore }}>
      <a class="nav-link" data-bs-toggle="modal" onclick={handleOpen} href="#">
        Stasharr
      </a>
      <Modal show={show()} onHide={handleClose} id={Stasharr.ID.SettingsModal}>
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
            <SearchOnAddSelect />
          </Show>
          <StashInstance />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={!store.valid()}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </SettingsContext.Provider>
  );
}

export default SettingsModal;
