import { SceneStatusType } from './SceneStatus';
import { StashDB } from './StashDB';

const stasharrPrefix = 'stasharr';
const attrPrefix = 'data';
const sceneStatus = `${attrPrefix}-${stasharrPrefix}-scenestatus`;
const cardButton = `${stasharrPrefix}-card-button`;
const studioadd = `${stasharrPrefix}-studioadd`;
const performeradd = `${stasharrPrefix}-performeradd`;
const headerButton = `${stasharrPrefix}-header-button`;
const settingsModal = `${stasharrPrefix}-settingsModal`;
const addallavailable = `${stasharrPrefix}-addallavailable`;
const studiomonitor = `${stasharrPrefix}-studiomonitor`;
const performermonitor = `${stasharrPrefix}-performermonitor`;
const searchallavailable = `${stasharrPrefix}-searchallavailable`;
const protocol = `${stasharrPrefix}-protocol`;
const domain = `${stasharrPrefix}-domain`;
const whisparrApiKey = `${stasharrPrefix}-whisparrApiKey`;
const qualityProfile = `${stasharrPrefix}-qualityProfile`;
const rootFolderPath = `${stasharrPrefix}-rootFolderPath`;
const searchOnAdd = `${stasharrPrefix}-searchOnAdd`;
const stashDomain = `${stasharrPrefix}-stashDomain`;
const tags = `${stasharrPrefix}-tags`;
const headerDetails = `${stasharrPrefix}-headerDetails`;
const whisparrCardButton = `whisparr-card-button`;
const stashApiKey = `${stasharrPrefix}-stashApiKey`;
const floatingCopyButton = `${stasharrPrefix}-floating-copy-button`;
const copyCardButton = `copy-card-button`;

export const Stasharr = {
  DataAttribute: {
    SceneStatus: sceneStatus,
  },
  ID: {
    HeaderDetails: headerDetails,
    StudioAdd: studioadd,
    PerformerAdd: performeradd,
    HeaderButton: headerButton,
    SettingsModal: settingsModal,
    AddAllAvailable: addallavailable,
    StudioMonitor: studiomonitor,
    PerformerMonitor: performermonitor,
    SearchAllExisting: searchallavailable,
    FloatingCopyButton: floatingCopyButton,
    Modal: {
      Protocol: protocol,
      Domain: domain,
      ApiKey: whisparrApiKey,
      QualityProfile: qualityProfile,
      RootFolderPath: rootFolderPath,
      SearchOnAdd: searchOnAdd,
      StashDomain: stashDomain,
      StashApiKey: stashApiKey,
      Tags: tags,
    },
  },
  DOMSelector: {
    WhisparrCardButton: `.${whisparrCardButton}`,
    HeaderDetails: `#${headerDetails}`,
    CardButton: `.${cardButton}`,
    CopyCardButton: `.${copyCardButton}`,
    StudioAdd: `#${studioadd}`,
    SettingsModal: `#${settingsModal}`,
    PerformerAdd: `#${performeradd}`,
    HeaderButton: `#${headerButton}`,
    AddAllAvailable: `#${addallavailable}`,
    StudioMonitor: `#${studiomonitor}`,
    PerformerMonitor: `#${performermonitor}`,
    SearchAllExisting: `#${searchallavailable}`,
    FloatingCopyButton: `#${floatingCopyButton}`,
    Modal: {
      Protocol: `#${protocol}`,
      Domain: `#${domain}`,
      ApiKey: `#${whisparrApiKey}`,
      QualityProfile: `#${qualityProfile}`,
      RootFolderPath: `#${rootFolderPath}`,
      SearchOnAdd: `#${searchOnAdd}`,
      StashDomain: `#${stashDomain}`,
      StashApiKey: `#${stashApiKey}`,
    },
    SceneCardWithNoStatus: () =>
      `${StashDB.DOMSelector.SceneCard}:not([${Stasharr.DataAttribute.SceneStatus}])`,
    SceneCardByButtonStatus: (status: SceneStatusType) =>
      `${StashDB.DOMSelector.SceneCard}:has([${Stasharr.DataAttribute.SceneStatus}='${status}'])`,
  },
};
