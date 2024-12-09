import { createSignal } from 'solid-js';
import { useSettings } from '../../../contexts/useSettings';
import { Stasharr } from '../../../enums/Stasharr';
import { FontAwesomeIcon } from 'solid-fontawesome';

const StashApiKey = () => {
  const { store, setStore } = useSettings();

  const handleChange = (value: string) => {
    setStore('stashApiKey', value === '' ? null : value);
  };

  const title = 'Locally hosted StashApp ApiKey';

  const toggleKeyVisibility = () => {
    if (iconString().includes('slash')) setIconString('fa-solid fa-eye');
    else setIconString('fa-solid fa-eye-slash');
  };

  const [iconString, setIconString] = createSignal('fa-solid fa-eye-slash');

  return (
    <div class="form-floating mb-3">
      <input
        class="form-control"
        id={Stasharr.ID.Modal.StashApiKey}
        name="apikey"
        placeholder=""
        data-bs-toggle="tooltip"
        aria-label={title}
        data-bs-title={title}
        type={iconString().includes('slash') ? 'password' : 'text'}
        value={store.stashApiKey}
        onChange={(e) => handleChange(e.target.value)}
      />
      <label for={Stasharr.ID.Modal.StashApiKey}>
        Locally hosted StashApp ApiKey
      </label>
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

export default StashApiKey;
