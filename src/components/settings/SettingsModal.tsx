import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from 'solid-js';
import { Modal, Button, Tab, Row, Col, Nav } from 'solid-bootstrap';
import { createStore } from 'solid-js/store';
import { Config } from '../../models/Config';
import WhisparrService from '../../service/WhisparrService';
import { SettingsContext } from '../../contexts/useSettings';
import { Stasharr } from '../../enums/Stasharr';
import { ReactiveStoreFactory } from '../../factory/ReactiveStoreFactory';
import WhisparrSettings from './whisparr/WhisparrSettings';
import StashSettings from './stashapp/StashSettings';

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

  const reactiveStore = createMemo(
    ReactiveStoreFactory.createReactiveStore(store),
  );

  const [systemStatus] = createResource(reactiveStore, async (s) => {
    return await WhisparrService.systemStatus(s);
  });

  createEffect(() => {
    // eslint-disable-next-line no-undef
    GM_registerMenuCommand('Settings', handleOpen);
  });

  return (
    <SettingsContext.Provider value={{ store, setStore }}>
      <a class="nav-link" data-bs-toggle="modal" onclick={handleOpen} href="#">
        Stasharr
      </a>
      <Modal
        show={show()}
        onHide={handleClose}
        id={Stasharr.ID.SettingsModal}
        fullscreen={true}
      >
        <Modal.Header closeButton>
          <Modal.Title>Stasharr Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tab.Container id="left-tabs" defaultActiveKey="whisparr">
            <Row>
              <Col sm={3}>
                <Nav variant="pills" class="flex-column">
                  <Nav.Item>
                    <Nav.Link eventKey="whisparr">Whisparr</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="stashapp">Stash App</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>
              <Col sm={9}>
                <Tab.Content>
                  <Tab.Pane eventKey="whisparr">
                    <WhisparrSettings systemStatus={systemStatus()} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="stashapp">
                    <StashSettings />
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
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
