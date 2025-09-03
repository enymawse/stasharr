import { createSignal, Show } from 'solid-js';
import { Modal, Button, Form } from 'solid-bootstrap';
import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';
import SceneService from '../service/SceneService';

type SceneDeleteProps = {
  type: 'scene';
  show: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  config: Config;
  stashId: string;
  whisparrScene: Whisparr.WhisparrScene | null;
};

function DeleteConfirmModal(props: SceneDeleteProps) {
  const [deleteFiles, setDeleteFiles] = createSignal(false);
  const [addExclusion, setAddExclusion] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const title = () => {
    if (props.type === 'scene') return 'Delete Scene';
    return 'Delete';
  };

  const primaryText = () => {
    if (props.type === 'scene') return 'Delete Scene';
    return 'Delete';
  };

  const handleConfirm = async () => {
    if (props.type !== 'scene') return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await SceneService.deleteSceneByStashId(
        props.config,
        props.stashId,
        {
          deleteFiles: deleteFiles(),
          addImportListExclusion: addExclusion(),
          suppressToasts: false,
        },
      );
      if (!ok) {
        setError('Failed to delete scene');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      props.onClose();
      props.onDeleted?.();
    } catch (e) {
      console.error(e);
      setError('An error occurred while deleting');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={props.show}
      onHide={props.onClose}
      backdrop={submitting() ? 'static' : true}
    >
      <Modal.Header closeButton={!submitting()}>
        <Modal.Title>{title()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Show when={props.type === 'scene'}>
          <p>
            You are about to delete the scene
            {props.whisparrScene ? ` "${props.whisparrScene.title}"` : ''} from
            Whisparr.
          </p>
          <ul>
            <li>Stash ID: {props.stashId}</li>
            <Show when={props.whisparrScene}>
              <li>Whisparr ID: {props.whisparrScene?.id}</li>
              <li>Has File: {props.whisparrScene?.hasFile ? 'Yes' : 'No'}</li>
            </Show>
          </ul>
          <Form>
            <Form.Check
              type="checkbox"
              id="delete-files"
              label="Also delete files from disk"
              checked={deleteFiles()}
              onChange={(e) =>
                setDeleteFiles((e.target as HTMLInputElement).checked)
              }
              disabled={submitting()}
            />
            <Form.Check
              type="checkbox"
              id="add-exclusion"
              label="Add exclusion to prevent re-adding"
              checked={addExclusion()}
              onChange={(e) =>
                setAddExclusion((e.target as HTMLInputElement).checked)
              }
              disabled={submitting()}
            />
          </Form>
        </Show>
        <Show when={error()}>
          <div class="alert alert-danger" role="alert">
            {error()}
          </div>
        </Show>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={props.onClose}
          disabled={submitting()}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={submitting()}
        >
          {submitting() ? 'Deleting…' : primaryText()}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DeleteConfirmModal;
