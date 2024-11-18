import { icon } from '@fortawesome/fontawesome-svg-core';
import { Stasharr } from '../enums/Stasharr';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

function CardHeader() {
  return <button id={Stasharr.ID.HeaderButton}>{icon(faDownload).html}</button>;
}

export default CardHeader;
