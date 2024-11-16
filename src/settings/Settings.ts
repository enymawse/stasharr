import { Modal } from 'bootstrap';
import { ModalBuilder } from '../builder/ModalBuilder';
import { Config, ConfigSchema } from '../models/Config';
import { YesNo } from '../enums/YesNo';
import { SettingKeys } from '../enums/SettingKeys';
import WhisparrService from '../service/WhisparrService';
import ToastService from '../service/ToastService';
import { parseInt } from 'lodash';

export class Settings {
  private _modal: Modal;
  private _config: Config;
  private _configSchema;

  /**
   * Creating a new instance of Settings builds the necessary functionality
   * and logic to allow the user to save and edit settings
   */
  constructor() {
    this._config = new Config();
    this._config.load();
    this._modal = new Modal(this.buildSettingsModal());
    this._configSchema = ConfigSchema;
  }

  static domConfigValues() {
    return {
      protocol: Settings.getInputValue(SettingKeys.Proto) === 'checked',
      domain: Settings.getInputValue(SettingKeys.Domain),
      whisparrApiKey: Settings.getInputValue(SettingKeys.ApiKey),
    };
  }

  private buildSettingsModal(): HTMLElement {
    const modalBuilder = new ModalBuilder('stasharr-settingsModal')
      .setModalTitle('stasharr Settings')
      .addProtocol(this._config)
      .addDomain(this._config)
      .addApiKey(this._config)
      .addQualityProfile(this._config)
      .addRootFolderPaths(this.config)
      .addSearchOnAdd(this.config)
      .addCloseButton('Close', this.closeModalHandler.bind(this))
      .addSaveButton('Save Changes', this.saveModalHandler.bind(this));

    const modalElement = modalBuilder.build();
    document.body.append(modalElement);
    return modalElement;
  }

  private closeModalHandler() {
    const modal = document.getElementById('stasharr-settingsModal');
    if (modal) {
      const bsModal = new Modal(modal);
      bsModal.hide();
    }
  }

  private async healthCheckWithUpdatedConfig(config: Config): Promise<boolean> {
    try {
      return await WhisparrService.healthCheck(config);
    } catch (error) {
      let message = 'Health Check failed';
      if (config.protocol) {
        message +=
          ' likely due to HTTPS being enabled and not having valid SSL certs. Try again with HTTP.';
      }
      ToastService.showToast(message, false);
      console.log(message, error);
    }
    return false;
  }

  private async saveModalHandler() {
    // Create a config object from the input values
    const configData = {
      protocol: Settings.getInputValue(SettingKeys.Proto) === 'checked',
      domain: Settings.getInputValue(SettingKeys.Domain),
      whisparrApiKey: Settings.getInputValue(SettingKeys.ApiKey),
      qualityProfile: parseInt(
        Settings.getSelectValue(SettingKeys.QualityProfile),
      ),
      rootFolderPath: Settings.getSelectValue(SettingKeys.RootFolderPath),
      rootFolderPathId: parseInt(
        Settings.getSelectValue(SettingKeys.RootFolderPathId),
      ),
      searchForNewMovie:
        Settings.getInputValue(SettingKeys.SearchForNewMovie) === YesNo.Yes,
    };

    // Validate the config data using the schema
    const parsedConfig = this._configSchema.safeParse(configData);

    if (
      !parsedConfig.success ||
      !(await this.healthCheckWithUpdatedConfig(new Config(parsedConfig.data)))
    ) {
      // Show an error if validation fails
      ToastService.showToast(
        'Failed to validate settings. Please review your inputs.',
        false,
      );
      console.error(parsedConfig.error);
      return;
    }

    // Assign validated values to the config object
    Object.assign(this._config, parsedConfig.data);

    // Save the validated config to persistent storage
    this._config.save();

    // Refresh to apply changes
    window.location.reload();

    // Provide feedback that settings were saved
    ToastService.showToast('Settings Saved Successfully', true);
  }

  static getSelectValue(id: string): string {
    let select;
    switch (id) {
      case SettingKeys.RootFolderPathId:
        select = document.getElementById(
          `stasharr-${SettingKeys.RootFolderPath}`,
        ) as HTMLSelectElement;
        return select.value;
      case SettingKeys.RootFolderPath:
        select = document.getElementById(
          `stasharr-${SettingKeys.RootFolderPath}`,
        ) as HTMLSelectElement;
        return select.options[select.selectedIndex].text;
      case SettingKeys.QualityProfile:
        select = document.getElementById(
          `stasharr-${SettingKeys.QualityProfile}`,
        ) as HTMLSelectElement;
        return select.value;
      default:
        console.warn('using the wrong key to get select values');
        return '';
    }
  }

  static getInputValue(id: string): string {
    if (id === SettingKeys.RootFolderPathId) {
      return (
        document.getElementById(
          `stasharr-${SettingKeys.RootFolderPath}`,
        ) as HTMLInputElement
      ).value;
    }

    const input = document.getElementById(`stasharr-${id}`);

    if (!input) {
      console.warn(`Element with id stasharr-${id} not found`);
      return '';
    }

    if (id === SettingKeys.Proto && input instanceof HTMLInputElement) {
      return input.checked ? 'checked' : 'unchecked';
    }

    if (
      id === SettingKeys.RootFolderPath &&
      input instanceof HTMLSelectElement
    ) {
      return input.options[input.selectedIndex]?.text || '';
    }

    return (input as HTMLInputElement).value || '';
  }

  public openSettingsModal() {
    const modal = document.getElementById('stasharr-settingsModal');

    // ensure options of select elements are updated appropriately
    const config = localStorage.getItem('stasharr-config');
    if (config) {
      const protocolOption = document.querySelector(
        `#stasharr-protocol [value='${JSON.parse(localStorage.getItem('stasharr-config')!).protocol}']`,
      );
      const searchOnAddOption = document.querySelector(
        `#stasharr-searchForNewMovie [value='${JSON.parse(localStorage.getItem('stasharr-config')!).searchForNewMovie}']`,
      );
      protocolOption?.setAttribute('selected', 'true');
      searchOnAddOption?.setAttribute('selected', 'true');
    }

    if (modal) {
      const m = new Modal(modal);
      m.show();
    } else {
      ToastService.showToast('stasharr failed to build modal');
    }
  }

  get config(): Config {
    return this._config;
  }
}
