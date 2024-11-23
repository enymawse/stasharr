import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Stasharr } from '../enums/Stasharr';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from 'solid-fontawesome';

library.add(faSpinner);

function LoadingButton(props: { header: boolean }) {
  return (
    <button
      classList={{
        'stasharr-button stasharr-button-loading': props.header,
        'stasharr-card-button stasharr-card-button-loading': !props.header,
      }}
      disabled
      id={props.header ? Stasharr.ID.HeaderButton : undefined}
    >
      <FontAwesomeIcon icon="fa-spin fa-spinner" />
      {props.header ? ' Loading' : ''}
    </button>
  );
}
export default LoadingButton;
