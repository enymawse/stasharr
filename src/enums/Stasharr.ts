import { SceneStatus } from './SceneStatus';
import { StashDB } from './StashDB';
import { getSelectorFromId } from '../util/util';

export const Stasharr = {
  DataAttribute: {
    SceneStatus: 'data-stasharr-scenestatus',
  },
  ID: {
    CardButton: 'stasharr-button',
    StudioAdd: 'stasharr-studioadd',
    PerformerAdd: 'stasharr-performeradd',
    HeaderButton: 'stasharr-header-button',
    SettingsModal: 'stasharr-settingsModal',
    AddAllAvailable: 'stasharr-addallavailable',
    StudioMonitor: 'stasharr-studiomonitor',
    PerformerMonitor: 'stasharr-performermonitor',
    SearchAllExisting: 'stasharr-searchallavailable',
  },
  DOMSelector: {
    CardButton: getSelectorFromId('stasharr-button'),
    StudioAdd: getSelectorFromId('stasharr-studioadd'),
    SettingsModal: getSelectorFromId('stasharr-settingsModal'),
    PerformerAdd: getSelectorFromId('stasharr-performeradd'),
    HeaderButton: getSelectorFromId('stasharr-header-button'),
    AddAllAvailable: getSelectorFromId('stasharr-addallavailable'),
    StudioMonitor: getSelectorFromId('stasharr-studiomonitor'),
    PerformerMonitor: getSelectorFromId('stasharr-performermonitor'),
    SearchAllExisting: getSelectorFromId('stasharr-searchallavailable'),
    SceneCardByButtonStatus: (status: SceneStatus) =>
      `${StashDB.DOMSelector.SceneCard}:has([${Stasharr.DataAttribute.SceneStatus}='${status}'])`,
  },
};
