import { icon } from '@fortawesome/fontawesome-svg-core';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Stasharr } from '../enums/Stasharr';

function LoadingButton(props: { header: boolean }) {
  return (
    <button
      classList={{
        'stasharr-button stasharr-button-loading': props.header,
        'stasharr-card-button stasharr-card-button-loading': !props.header,
      }}
      disabled
      id={props.header ? Stasharr.ID.HeaderButton : Stasharr.ID.CardButton}
    >
      <span
        innerHTML={icon(faSpinner, { classes: ['fa-spin'] }).html[0]}
      ></span>
      {props.header ? ' ' + 'Loading' : ''}
    </button>
  );
}
export default LoadingButton;
