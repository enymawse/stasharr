import { Stasharr } from '../../../enums/Stasharr';
import { useSettings } from '../../../contexts/useSettings';

const ProtocolSwitch = () => {
  const { store, setStore } = useSettings();

  const handleProtocolChange = (value: boolean) => {
    setStore('protocol', value);
  };

  return (
    <div class="form-check form-switch mb-3">
      <input
        class="form-check-input"
        role="switch"
        id={Stasharr.ID.Modal.Protocol}
        data-bs-toggle="tooltip"
        aria-label="Enable if you have configured Whisparr with valid certs, otherwise leave unchecked."
        data-bs-title="Enable if you have configured Whisparr with valid certs, otherwise leave unchecked."
        type="checkbox"
        checked={store.protocol}
        onChange={(e) => handleProtocolChange(e.target.checked)}
      />
      <label class="form-check-label" for={Stasharr.ID.Modal.Protocol}>
        HTTPS
      </label>
    </div>
  );
};

export default ProtocolSwitch;
