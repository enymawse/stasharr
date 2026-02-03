import { createMemo, createResource, For } from 'solid-js';
import { useSettings } from '../../../contexts/useSettings';
import { Form } from 'solid-bootstrap';
import { Stasharr } from '../../../enums/Stasharr';
import { ReactiveStoreFactory } from '../../../factory/ReactiveStoreFactory';
import WhisparrService from '../../../service/WhisparrService';

const QualityProfileSelect = () => {
  const { store, setStore } = useSettings();

  const reactiveStore = createMemo(
    ReactiveStoreFactory.createReactiveStore(store),
  );

  const [qualityProfiles] = createResource(reactiveStore, async (s) => {
    if (!s.basicValidation()) return [];
    return (await WhisparrService.qualityProfiles(s)) || [];
  });

  const handleQualityProfileChange = (value: number) => {
    setStore('qualityProfile', value);
  };

  return (
    <div class="input-group mb-3">
      <label class="input-group-text">Quality Profile</label>
      <Form.Select
        aria-label="Quality Profile select"
        onChange={(e) => handleQualityProfileChange(parseInt(e.target.value))}
        value={store.qualityProfile}
        id={Stasharr.ID.Modal.QualityProfile}
      >
        <option>Select the Quality Profile...</option>
        <For each={qualityProfiles()}>
          {(qualityProfile) => (
            <option
              selected={store.qualityProfile === qualityProfile.id}
              value={qualityProfile.id}
            >
              {qualityProfile.name}
            </option>
          )}
        </For>
      </Form.Select>
    </div>
  );
};

export default QualityProfileSelect;
