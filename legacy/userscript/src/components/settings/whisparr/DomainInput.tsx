import { Stasharr } from '../../../enums/Stasharr';
import { useSettings } from '../../../contexts/useSettings';

const DomainInput = () => {
  const { store, setStore } = useSettings();

  const handleDomainChange = (value: string) => {
    setStore('domain', value);
  };

  return (
    <div class="form-floating mb-3">
      <input
        class="form-control"
        id={Stasharr.ID.Modal.Domain}
        name="domain"
        placeholder=""
        data-bs-toggle="tooltip"
        aria-label="ex. localhost:6969 or whisparr.customdomain.home or whisparr.lan:123"
        data-bs-title="ex. localhost:6969 or whisparr.customdomain.home or whisparr.lan:123"
        type="text"
        value={store.domain}
        onChange={(e) => handleDomainChange(e.target.value)}
      />
      <label for={Stasharr.ID.Modal.Domain}>
        Whisparr URL or IP address with port number
      </label>
    </div>
  );
};

export default DomainInput;
