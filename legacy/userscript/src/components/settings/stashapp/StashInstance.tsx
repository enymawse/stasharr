import { useSettings } from '../../../contexts/useSettings';
import { Stasharr } from '../../../enums/Stasharr';
import SmartUrlInput from '../common/SmartUrlInput';

const StashInstance = () => {
  const { store, setStore } = useSettings();

  const handleChange = (value: string) => {
    // Remove trailing slashes and normalize empty values
    const cleanValue = value.trim().replace(/\/+$/, '');
    setStore('stashDomain', cleanValue === '' ? '' : cleanValue);
  };

  return (
    <SmartUrlInput
      label="Stash Instance URL"
      value={store.stashDomain || ''}
      onChange={handleChange}
      serviceType="stash"
      id={Stasharr.ID.Modal.StashDomain}
      placeholder="Enter your Stash instance URL"
      required={false}
    />
  );
};

export default StashInstance;
