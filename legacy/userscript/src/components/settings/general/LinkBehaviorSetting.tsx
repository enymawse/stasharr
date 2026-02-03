import { useSettings } from '../../../contexts/useSettings';
import { Stasharr } from '../../../enums/Stasharr';

const LinkBehaviorSetting = () => {
  const { store, setStore } = useSettings();

  const handleChange = (enabled: boolean) => {
    setStore('openLinksInNewTab', enabled);
  };

  return (
    <div class="form-check form-switch mb-3">
      <input
        class="form-check-input"
        role="switch"
        id={Stasharr.ID.OpenLinksInNewTab}
        type="checkbox"
        checked={store.openLinksInNewTab}
        onChange={(e) => handleChange(e.target.checked)}
      />
      <label class="form-check-label" for={Stasharr.ID.OpenLinksInNewTab}>
        Open links in new tab
        <small class="text-muted d-block">
          When enabled, Whisparr, Stash, and documentation links will open in
          new tabs
        </small>
      </label>
    </div>
  );
};

export default LinkBehaviorSetting;
