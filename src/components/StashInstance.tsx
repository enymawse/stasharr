import { useSettings } from '../contexts/useSettings';
import { Stasharr } from '../enums/Stasharr';

const StashInstance = () => {
  const { store, setStore } = useSettings();

  const handleChange = (value: string) => {
    setStore('stashDomain', value);
    console.log('New Stash Domain Value: ', store.stashDomain);
  };

  const tooltip =
    'ex. http://localhost:9999 or https://stash.customdomain.home or http://whisparr.lan:123';

  return (
    <div class="form-floating mb-3">
      <input
        class="form-control"
        id={Stasharr.ID.Modal.StashDomain}
        name="domain"
        placeholder=""
        data-bs-toggle="tooltip"
        aria-label={tooltip}
        data-bs-title={tooltip}
        type="text"
        value={store.stashDomain}
        onChange={(e) => handleChange(e.target.value)}
      />
      <label for={Stasharr.ID.Modal.Domain}>
        Entire URL for your self-hosted Stash App instance.
      </label>
    </div>
  );
};

export default StashInstance;
