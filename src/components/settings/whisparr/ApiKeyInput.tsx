import { FontAwesomeIcon } from 'solid-fontawesome';
import { useSettings } from '../../../contexts/useSettings';
import { Stasharr } from '../../../enums/Stasharr';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { createSignal } from 'solid-js';

library.add(faEye, faEyeSlash);

const WhisparrApiKeyInput = () => {
  const { store, setStore } = useSettings();

  const handleApiKeyChange = (value: string) => {
    setStore('whisparrApiKey', value);
  };

  const toggleKeyVisibility = () => {
    if (iconString().includes('slash')) setIconString('fa-solid fa-eye');
    else setIconString('fa-solid fa-eye-slash');
  };

  const [iconString, setIconString] = createSignal('fa-solid fa-eye-slash');

  return (
    <div class="form-floating mb-3">
      <input
        class="form-control"
        id={Stasharr.ID.Modal.ApiKey}
        name="whisparrApiKey"
        placeholder=""
        data-bs-toggle="tooltip"
        aria-label="Found in Whisparr under Settings -> General"
        data-bs-title="Found in Whisparr under Settings -> General"
        type={iconString().includes('slash') ? 'password' : 'text'}
        value={store.whisparrApiKey}
        onChange={(e) => handleApiKeyChange(e.target.value)}
      />
      <label for={Stasharr.ID.Modal.ApiKey}>Whisparr API Key</label>
      <button
        class="btn btn-sm toggle-password"
        type="button"
        onClick={toggleKeyVisibility}
      >
        <FontAwesomeIcon icon={iconString()} />
      </button>
    </div>
  );
};

export default WhisparrApiKeyInput;
