import { useSettings } from '../../../contexts/useSettings';
import { Stasharr } from '../../../enums/Stasharr';
import SmartUrlInput from '../common/SmartUrlInput';
import { createMemo } from 'solid-js';

const WhisparrUrlInput = () => {
  const { store, setStore } = useSettings();

  const handleDomainChange = (value: string) => {
    setStore('domain', value.trim());
  };

  const handleProtocolChange = (useHttps: boolean) => {
    setStore('protocol', useHttps);
  };

  // Create a memo for the combined input value to handle the protocol display
  const displayValue = createMemo(() => store.domain || '');

  return (
    <div class="mb-3">
      <SmartUrlInput
        label="Whisparr Instance"
        value={displayValue()}
        onChange={handleDomainChange}
        serviceType="whisparr"
        useHttps={store.protocol}
        id={Stasharr.ID.Modal.Domain}
        placeholder="Enter your Whisparr address"
        required={true}
      />

      {/* Protocol Switch */}
      <div class="form-check form-switch mt-2">
        <input
          class="form-check-input"
          role="switch"
          id={Stasharr.ID.Modal.Protocol}
          type="checkbox"
          checked={store.protocol}
          onChange={(e) => handleProtocolChange(e.target.checked)}
        />
        <label class="form-check-label" for={Stasharr.ID.Modal.Protocol}>
          Use HTTPS
          <small class="text-muted d-block">
            Enable if you have configured Whisparr with valid SSL certificates
          </small>
        </label>
      </div>
    </div>
  );
};

export default WhisparrUrlInput;
