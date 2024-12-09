import { Show } from 'solid-js';
import { Whisparr } from '../../../types/whisparr';
import WhisparrApiKeyInput from './ApiKeyInput';
import DomainInput from './DomainInput';
import ProtocolSwitch from './ProtocolSwitch';
import QualityProfileSelect from './QualityProfile';
import RootFolderPathSelect from './RootFolderPath';
import SearchOnAddSelect from './SearchOnAdd';
import Tags from './Tags';
import VersionAlert from './VersionAlert';

const WhisparrSettings = (props: {
  systemStatus: Whisparr.SystemStatus | null | undefined;
}) => {
  return (
    <>
      <VersionAlert />
      <ProtocolSwitch />
      <DomainInput />
      <WhisparrApiKeyInput />
      <Show when={props.systemStatus}>
        <QualityProfileSelect />
        <RootFolderPathSelect />
        <SearchOnAddSelect />
        <Tags />
      </Show>
    </>
  );
};

export default WhisparrSettings;
