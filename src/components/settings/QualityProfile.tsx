import { For } from 'solid-js';
import { useSettings } from '../../contexts/useSettings';
import { Form } from 'solid-bootstrap';
import { Whisparr } from '../../types/whisparr';
import { Stasharr } from '../../enums/Stasharr';

const QualityProfileSelect = (props: {
  qualityProfiles: Whisparr.QualityProfile[] | undefined;
}) => {
  const { store, setStore } = useSettings();

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
        <For each={props.qualityProfiles}>
          {(qualityProfile) => (
            <option value={qualityProfile.id}>{qualityProfile.name}</option>
          )}
        </For>
      </Form.Select>
    </div>
  );
};

export default QualityProfileSelect;
