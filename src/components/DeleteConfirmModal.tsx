import { createEffect, createSignal, Show } from 'solid-js';
import { Modal, Button, Form } from 'solid-bootstrap';
import { Config } from '../models/Config';
import { Whisparr } from '../types/whisparr';
import SceneService from '../service/SceneService';
import StashSceneService from '../service/stash/StashSceneService';
import { StashScene } from '../types/stash';

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
  const [stashScene, setStashScene] = createSignal<StashScene | null>(null);
  const [alsoRemoveFromStash, setAlsoRemoveFromStash] = createSignal(false);
  const [deleteFileVia, setDeleteFileVia] = createSignal<
    'none' | 'whisparr' | 'stash'
  >('none');
  const [deleteGenerated, setDeleteGenerated] = createSignal(false);

  const title = () => {
    if (props.type === 'scene') return 'Delete Scene';
    return 'Delete';
  };

  const primaryText = () => {
    if (props.type === 'scene') return 'Delete Scene';
    return 'Delete';
  };

  const stashConfigured = () => props.config.stashValid() === true;
  const sceneHasFile = () => Boolean(props.whisparrScene?.hasFile);

  createEffect(() => {
    // Load Stash scene when modal opens and Stash is configured
    if (props.show && stashConfigured()) {
      StashSceneService.getSceneByStashId(props.config, props.stashId)
        .then((s) => setStashScene(s || null))
        .catch(() => setStashScene(null));
    }
    if (!props.show) {
      setAlsoRemoveFromStash(false);
      setDeleteFileVia('none');
      setDeleteGenerated(false);
      setDeleteFiles(false);
      setError(null);
    }
  });

  const handleConfirm = async () => {
    if (props.type !== 'scene') return;
    setSubmitting(true);
    setError(null);
    try {
      // Determine deletion strategy
      const viaWhisparr = deleteFileVia() === 'whisparr';
      const viaStash = deleteFileVia() === 'stash';

      // If deleting file via Stash, remove from Stash first (delete file + generated if chosen)
      if (alsoRemoveFromStash() && viaStash) {
        const stashOk = await StashSceneService.deleteSceneByStashId(
          props.config,
          props.stashId,
          {
            deleteFile: true,
            deleteGenerated: deleteGenerated(),
          },
        );
        if (!stashOk) {
          setError('Failed to delete scene from Stash');
          setSubmitting(false);
          return;
        }
      }

      // Delete from Whisparr (delete files only if chosen via Whisparr or using fallback checkbox)
      const whisparrOk = await SceneService.deleteSceneByStashId(
        props.config,
        props.stashId,
        {
          deleteFiles:
            viaWhisparr || !sceneHasFile() || !stashConfigured()
              ? deleteFiles()
              : false,
          addImportListExclusion: addExclusion(),
          suppressToasts: false,
        },
      );
      if (!whisparrOk) {
        setError('Failed to delete scene');
        setSubmitting(false);
        return;
      }

      // If user chose to also remove from Stash but didn't delete files via Stash yet, remove Stash now
      if (alsoRemoveFromStash() && !viaStash) {
        const stashOk = await StashSceneService.deleteSceneByStashId(
          props.config,
          props.stashId,
          {
            deleteFile: false,
            deleteGenerated: deleteGenerated(),
          },
        );
        if (!stashOk) {
          setError('Deleted in Whisparr but failed to remove from Stash');
          setSubmitting(false);
          return;
        }
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
              id="add-exclusion"
              label="Add exclusion to prevent re-adding"
              checked={addExclusion()}
              onChange={(e) =>
                setAddExclusion((e.target as HTMLInputElement).checked)
              }
              disabled={submitting()}
            />
            <Show when={sceneHasFile() && stashConfigured()}>
              <hr />
              <Form.Check
                type="checkbox"
                id="also-remove-stash"
                label="Also remove this scene from Stash"
                checked={alsoRemoveFromStash()}
                onChange={(e) =>
                  setAlsoRemoveFromStash((e.target as HTMLInputElement).checked)
                }
                disabled={submitting() || !stashScene()}
              />
              <div class="ms-3 mt-2">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="delete-file-via"
                    id="delete-file-none"
                    checked={deleteFileVia() === 'none'}
                    onChange={() => setDeleteFileVia('none')}
                    disabled={submitting()}
                  />
                  <label class="form-check-label" for="delete-file-none">
                    Do not delete files
                  </label>
                </div>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="delete-file-via"
                    id="delete-file-whisparr"
                    checked={deleteFileVia() === 'whisparr'}
                    onChange={() => setDeleteFileVia('whisparr')}
                    disabled={submitting()}
                  />
                  <label class="form-check-label" for="delete-file-whisparr">
                    Delete file via Whisparr
                  </label>
                </div>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="delete-file-via"
                    id="delete-file-stash"
                    checked={deleteFileVia() === 'stash'}
                    onChange={() => setDeleteFileVia('stash')}
                    disabled={submitting() || !alsoRemoveFromStash()}
                  />
                  <label class="form-check-label" for="delete-file-stash">
                    Delete file via Stash
                  </label>
                </div>
                <div class="form-check ms-3 mt-2">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="delete-generated"
                    checked={deleteGenerated()}
                    onChange={(e) =>
                      setDeleteGenerated((e.target as HTMLInputElement).checked)
                    }
                    disabled={submitting() || deleteFileVia() !== 'stash'}
                  />
                  <label class="form-check-label" for="delete-generated">
                    Also delete generated files (thumbnails, transcodes)
                  </label>
                </div>
              </div>
            </Show>
            <Show when={!sceneHasFile() || !stashConfigured()}>
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
            </Show>
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
