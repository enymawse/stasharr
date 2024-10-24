import { Modal } from "bootstrap";
import { ModalBuilder } from "../builder/ModalBuilder";
import { Config, ConfigSchema } from "../models/Config";
import { YesNo } from "../enums/YesNo";
import { SettingKeys } from "../enums/SettingKeys";
import WhisparrService from "../service/WhisparrService";
import ToastService from "../service/ToastService";

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

  private buildSettingsModal(): HTMLElement {
    const modalBuilder = new ModalBuilder("stasharr-settingsModal")
      .setModalTitle("stasharr Settings")
      .addInputField(
        "Scheme",
        SettingKeys.Scheme,
        "select",
        ["https", "http"],
        undefined,
        this._config.scheme,
        "http or https",
      )
      .addInputField(
        "Domain",
        SettingKeys.Domain,
        "text",
        undefined,
        "Whisparr URL or IP address with port number",
        this._config.domain,
        "ex. localhost:6969 or whisparr.customdomain.home or whisparr.lan:123",
      )
      .addInputField(
        "API Key",
        SettingKeys.ApiKey,
        "password",
        undefined,
        "Enter your Whisparr API Key",
        this._config.whisparrApiKey,
        "Found in Whisparr under Settings -> General",
      )
      .addInputField(
        "Quality Profile",
        SettingKeys.QualityProfile,
        "text",
        undefined,
        "Name of your desired quality profile",
        this._config.qualityProfile.toString(),
        "Found in Whisparr under Settings -> Profiles",
      )
      .addInputField(
        "Root Folder Path",
        SettingKeys.RootFolderPath,
        "text",
        undefined,
        "Root folder path to where you keep your media",
        this._config.rootFolderPath,
        "Found in Whisparr under Settings -> Media Management",
      )
      .addInputField(
        "Search On Add",
        SettingKeys.SearchForNewMovie,
        "select",
        [YesNo.Yes, YesNo.No],
        undefined,
        "Yes",
        "Would you like Whipsarr to search for scenes after they are added?",
      )
      .addCloseButton("Close", this.closeModalHandler.bind(this))
      .addSaveButton("Save Changes", this.saveModalHandler.bind(this));

    const modalElement = modalBuilder.build();
    document.body.append(modalElement);
    return modalElement;
  }

  private closeModalHandler() {
    const modal = document.getElementById("stasharr-settingsModal");
    if (modal) {
      const bsModal = new Modal(modal);
      bsModal.hide();
    }
  }

  private async validateSettings(config: Config): Promise<boolean> {
    try {
      const response = await WhisparrService.healthCheck(config);
      return response.status == 200;
    } catch (error) {
      ToastService.showToast("Validation failed", false);
      console.log("Validation failed", error);
    }
    return false;
  }

  private async saveModalHandler() {
    // Create a config object from the input values
    const configData = {
      scheme: Settings.getInputValue(SettingKeys.Scheme),
      domain: Settings.getInputValue(SettingKeys.Domain),
      whisparrApiKey: Settings.getInputValue(SettingKeys.ApiKey),
      qualityProfile: Number.parseInt(
        Settings.getInputValue(SettingKeys.QualityProfile),
      ),
      rootFolderPath: Settings.getInputValue(SettingKeys.RootFolderPath),
      searchForNewMovie:
        Settings.getInputValue(SettingKeys.SearchForNewMovie) === YesNo.Yes,
    };

    // Validate the config data using the schema
    const parsedConfig = this._configSchema.safeParse(configData);

    if (
      !parsedConfig.success ||
      !(await this.validateSettings(parsedConfig.data as Config))
    ) {
      // Show an error if validation fails
      ToastService.showToast(
        "Invalid settings. Please review your inputs.",
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
    ToastService.showToast("Settings Saved Successfully", true);
  }

  private static getInputValue(id: string): string {
    const input = document.getElementById(`stasharr-${id}`) as HTMLInputElement;
    return input ? input.value : "";
  }

  public openSettingsModal(event: MouseEvent | KeyboardEvent) {
    const modal = document.getElementById("stasharr-settingsModal");

    // ensure options of select elements are updated appropriately
    const config = localStorage.getItem("stasharr-config");
    if (config) {
      const schemeOption = document.querySelector(
        `#stasharr-scheme [value='${JSON.parse(localStorage.getItem("stasharr-config")!).scheme}']`,
      );
      const searchOnAddOption = document.querySelector(
        `#stasharr-searchForNewMovie [value='${JSON.parse(localStorage.getItem("stasharr-config")!).searchForNewMovie}']`,
      );
      schemeOption?.setAttribute("selected", "true");
      searchOnAddOption?.setAttribute("selected", "true");
    }

    if (modal) {
      const m = new Modal(modal);
      m.show();
    } else {
      ToastService.showToast("stasharr failed to build modal");
    }
  }

  get config(): Config {
    return this._config;
  }
}
