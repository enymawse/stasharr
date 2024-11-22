import { For } from 'solid-js';
import { useSettings } from '../contexts/useSettings';
import { Form } from 'solid-bootstrap';
import { Stasharr } from '../enums/Stasharr';

const SearchOnAddSelect = () => {
  const { store, setStore } = useSettings();

  const handleSearchOnAddChange = (value: string) => {
    setStore('searchForNewMovie', value === 'Yes');
  };

  return (
    <div class="input-group mb-3">
      <label class="input-group-text">Search upon Add</label>
      <Form.Select
        aria-label="Search upon Add select"
        onChange={(e) => handleSearchOnAddChange(e.target.value)}
        value={store.searchForNewMovie ? 'Yes' : 'No'}
        id={Stasharr.ID.Modal.SearchOnAdd}
      >
        <For each={['Yes', 'No']}>
          {(yesOrNo) => <option value={yesOrNo}>{yesOrNo}</option>}
        </For>
      </Form.Select>
    </div>
  );
};

export default SearchOnAddSelect;
