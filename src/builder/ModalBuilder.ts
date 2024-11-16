import { Tooltip } from 'bootstrap';
import { Styles } from '../enums/Styles';
import { BsElement } from './BsElement';
import { SettingKeys } from '../enums/SettingKeys';
import WhisparrService from '../service/WhisparrService';
import { Config } from '../models/Config';
import { YesNo } from '../enums/YesNo';
import { Settings } from '../settings/Settings';
import { parseInt } from 'lodash';

export class ModalBuilder {
  private modalElement: HTMLElement;
  private modalContent: HTMLElement;

  constructor(modalId: string) {
    this.modalElement = document.createElement('div');
    this.modalElement.id = modalId;
    this.modalElement.classList.add('fade', 'modal');

    const modalDialog = document.createElement('div');
    modalDialog.classList.add('modal-dialog');

    this.modalContent = document.createElement('div');
    this.modalContent.classList.add('modal-content');

    modalDialog.appendChild(this.modalContent);
    this.modalElement.appendChild(modalDialog);
  }

  setModalTitle(title: string): ModalBuilder {
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('modal-header');

    const titleElement = document.createElement('h5');
    titleElement.classList.add('modal-title');
    titleElement.innerText = title;

    const closeElement = document.createElement('button');
    closeElement.classList.add('btn-close');
    closeElement.setAttribute('data-bs-dismiss', 'modal');
    closeElement.ariaLabel = 'Close';

    headerDiv.appendChild(titleElement);
    headerDiv.appendChild(closeElement);
    this.modalContent.appendChild(headerDiv);
    return this;
  }

  setModalBody(bodyContent: string): ModalBuilder {
    const bodyDiv = document.createElement('div');
    bodyDiv.classList.add('modal-body');
    bodyDiv.innerText = bodyContent;
    this.modalContent.appendChild(bodyDiv);
    return this;
  }

  addProtocol(config: Config): ModalBuilder {
    const bodyDiv = this.getOrCreateBody();

    const inputSwitch = BsElement.inputSwitch({
      id: `stasharr-${SettingKeys.Proto}`,
      label: 'HTTPS',
      checked: config.protocol,
      tooltip:
        'Enable if you have configured Whisparr with valid certs, otherwise leave unchecked.',
    });

    this.addSelectRefreshers('change', inputSwitch);

    bodyDiv.appendChild(inputSwitch);
    return this;
  }

  addDomain(config: Config): ModalBuilder {
    const bodyDiv = this.getOrCreateBody();
    const floatingInputElement = BsElement.floatingInput({
      id: `stasharr-${SettingKeys.Domain}`,
      name: SettingKeys.Domain,
      label: 'Whisparr URL or IP address with port number',
      tooltip:
        'ex. localhost:6969 or whisparr.customdomain.home or whisparr.lan:123',
      defaultValue: config.domain,
    });

    this.addSelectRefreshers('focusout', floatingInputElement);

    bodyDiv.appendChild(floatingInputElement);
    return this;
  }

  addApiKey(config: Config): ModalBuilder {
    const bodyDiv = this.getOrCreateBody();
    const floatingInputElement = BsElement.floatingInput({
      id: `stasharr-${SettingKeys.ApiKey}`,
      name: SettingKeys.ApiKey,
      label: 'Whisparr API Key',
      tooltip: 'Found in Whisparr under Settings -> General',
      defaultValue: config.whisparrApiKey,
      type: 'password',
    });

    this.addSelectRefreshers('focusout', floatingInputElement);

    bodyDiv.appendChild(floatingInputElement);
    return this;
  }

  private addSelectRefreshers(type: string, element: HTMLElement) {
    element.addEventListener(type, this.refreshQualityProfiles, {
      passive: true,
    });
    element.addEventListener(type, this.refreshRootFolderPaths, {
      passive: true,
    });
  }

  refreshQualityProfiles(): void {
    const selectId = `stasharr-${SettingKeys.QualityProfile}`;
    const selectElement = document.getElementById(selectId);
    const rawUserSettings = Settings.domConfigValues();
    selectElement?.replaceWith(
      BsElement.dynamicSelectWithDefault(
        selectId,
        parseInt(Settings.getSelectValue(SettingKeys.QualityProfile)),
        WhisparrService.getQualityProfilesForSelectMenu,
        WhisparrService.healthCheck,
        new Config({
          protocol: rawUserSettings.protocol,
          whisparrApiKey: rawUserSettings.whisparrApiKey,
          domain: rawUserSettings.domain,
        }),
        'Desired Quality Profile for adding scenes.',
      ),
    );
  }

  refreshRootFolderPaths(): void {
    const selectId = `stasharr-${SettingKeys.RootFolderPath}`;
    const selectElement = document.getElementById(selectId);
    const rawUserSettings = Settings.domConfigValues();
    selectElement?.replaceWith(
      BsElement.dynamicSelectWithDefault(
        selectId,
        parseInt(Settings.getSelectValue(SettingKeys.QualityProfile)),
        WhisparrService.getRootFolderPathsForSelectMenu,
        WhisparrService.healthCheck,
        new Config({
          protocol: rawUserSettings.protocol,
          whisparrApiKey: rawUserSettings.whisparrApiKey,
          domain: rawUserSettings.domain,
        }),
        'Desired Root Folder Path for adding scenes.',
      ),
    );
  }

  addQualityProfile(config: Config): ModalBuilder {
    const selectId = `stasharr-${SettingKeys.QualityProfile}`;

    const bodyDiv = this.getOrCreateBody();

    const inputGroup = this.inputGroup(selectId, 'Quality Profile');

    const selectElement = BsElement.dynamicSelectWithDefault(
      selectId,
      config.qualityProfile,
      WhisparrService.getQualityProfilesForSelectMenu,
      WhisparrService.healthCheck,
      config,
      'Desired Quality Profile for adding scenes.',
    );

    inputGroup.appendChild(selectElement);
    bodyDiv.appendChild(inputGroup);
    return this;
  }

  addRootFolderPaths(config: Config): ModalBuilder {
    const selectId = `stasharr-${SettingKeys.RootFolderPath}`;

    const bodyDiv = this.getOrCreateBody();

    const inputGroup = this.inputGroup(selectId, 'Root Folder Path');

    const selectElement = BsElement.dynamicSelectWithDefault(
      selectId,
      config.rootFolderPathId,
      WhisparrService.getRootFolderPathsForSelectMenu,
      WhisparrService.healthCheck,
      config,
      'Desired Root Folder Path for adding scenes.',
    );

    inputGroup.appendChild(selectElement);
    bodyDiv.appendChild(inputGroup);
    return this;
  }

  addSearchOnAdd(config: Config): ModalBuilder {
    const selectId = `stasharr-${SettingKeys.SearchForNewMovie}`;

    const bodyDiv = this.getOrCreateBody();

    const inputGroup = this.inputGroup(selectId, 'Search On Add');

    const selectElement = BsElement.staticSelect(
      selectId,
      config.searchForNewMovie ? YesNo.Yes : YesNo.No,
      [YesNo.Yes, YesNo.No],
    );

    inputGroup.appendChild(selectElement);
    bodyDiv.appendChild(inputGroup);
    return this;
  }

  private inputGroup(selectId: string, innerText: string) {
    const inputGroup = document.createElement('div');
    inputGroup.classList.add('input-group', 'mb-3');
    const inputGroupLabel = document.createElement('label');
    inputGroupLabel.innerText = innerText;
    inputGroupLabel.classList.add('input-group-text');
    inputGroupLabel.setAttribute('for', selectId);
    inputGroup.appendChild(inputGroupLabel);
    return inputGroup;
  }

  addInputField(
    label: string,
    name: string,
    type:
      | 'text'
      | 'number'
      | 'email'
      | 'password'
      | 'select'
      | 'dropdown-input',
    options?: string[], // For dropdown or select types
    placeholder?: string,
    defaultValue?: string,
    tooltip?: string,
    handler?: { name: string; func: (this: HTMLElement, e: Event) => void },
    style?: 'floating' | 'input-group',
  ): ModalBuilder {
    const bodyDiv = this.getOrCreateBody();
    let formGroup;

    if (style === 'floating') {
      formGroup = this.createFormFloatingGroup(label, name, tooltip);
    } else if (style === 'input-group') {
      formGroup = this.createInputGroup(label, name, tooltip);
    } else {
      formGroup = this.createFormGroup(label, name, tooltip);
    }

    let inputElement: HTMLElement;
    if (type === 'select' && options) {
      inputElement = this.createSelectElement(name, options);
    } else {
      inputElement = this.createInputElement(
        type,
        name,
        placeholder,
        defaultValue,
      );
    }

    if (tooltip) {
      this.addTooltip(inputElement, tooltip);
    }

    formGroup.appendChild(inputElement);
    bodyDiv.appendChild(formGroup);

    this.initializeTooltips(formGroup);

    return this;
  }

  private createFormFloatingGroup(
    label: string,
    name: string,
    tooltip?: string,
  ): HTMLElement {
    const formFloat = document.createElement('div');
    formFloat.classList.add('form-floating', 'mb-3');

    const inputFloat = document.createElement('input');
    inputFloat.type = 'text';
    inputFloat.classList.add('form-control');
    inputFloat.id = `stasharr-${name}`;
    inputFloat.name = name;
    inputFloat.placeholder = '';

    const labelFor = document.createElement('label');
    labelFor.setAttribute('for', `stasharr-${name}`);
    labelFor.innerHTML = label;
    labelFor.style.color = Styles.Color.GRAY;

    if (tooltip) {
      this.addTooltip(inputFloat, tooltip);
    }

    formFloat.appendChild(inputFloat);
    formFloat.appendChild(labelFor);

    return formFloat;
  }

  private createFormGroup(
    label: string,
    name: string,
    tooltip?: string,
  ): HTMLElement {
    const formGroup = document.createElement('div');
    formGroup.classList.add('form-group', 'mb-3');

    const inputLabel = document.createElement('label');
    inputLabel.innerText = label;
    inputLabel.setAttribute('for', `stasharr-${name}`);

    if (tooltip) {
      this.addTooltip(inputLabel, tooltip);
    }

    formGroup.appendChild(inputLabel);
    return formGroup;
  }

  private createInputGroup(
    label: string,
    name: string,
    tooltip?: string,
  ): HTMLElement {
    const inputGroup = document.createElement('div');
    inputGroup.classList.add('input-group', 'mb-3');

    const inputLabel = document.createElement('span');
    inputLabel.classList.add('input-group-text');
    inputLabel.innerText = label;

    if (tooltip) {
      this.addTooltip(inputLabel, tooltip);
    }

    inputGroup.appendChild(inputLabel);
    return inputGroup;
  }

  private createSelectElement(
    name: string,
    options: string[],
  ): HTMLSelectElement {
    const selectElement = document.createElement('select');
    selectElement.classList.add('form-control');
    selectElement.id = `stasharr-${name}`;
    selectElement.name = name;

    options.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.innerText = option;
      selectElement.appendChild(optionElement);
    });

    return selectElement;
  }

  private createInputElement(
    type: string,
    name: string,
    placeholder?: string,
    defaultValue?: string,
  ): HTMLInputElement {
    const inputElement = document.createElement('input');
    inputElement.type = type;
    inputElement.classList.add('form-control');
    inputElement.id = `stasharr-${name}`;
    inputElement.name = name;

    if (placeholder) inputElement.placeholder = placeholder;
    if (defaultValue) inputElement.value = defaultValue;

    return inputElement;
  }

  private addTooltip(element: HTMLElement, tooltip: string): void {
    element.setAttribute('data-bs-toggle', 'tooltip');
    element.setAttribute('title', tooltip);
  }

  addCloseButton(
    label: string,
    onClick: (this: HTMLButtonElement, ev: MouseEvent) => void,
  ): ModalBuilder {
    return this.addFooterButton(label, 'btn-secondary', onClick);
  }

  addSaveButton(
    label: string,
    onClick: (this: HTMLButtonElement, ev: MouseEvent) => void,
  ): ModalBuilder {
    return this.addFooterButton(label, 'btn-primary', onClick);
  }

  addFooterButton(
    label: string,
    styleClass: string,
    onClick: (this: HTMLButtonElement, ev: MouseEvent) => void,
  ): ModalBuilder {
    const footerDiv = this.getOrCreateFooter();
    const button = this.createButton(label, styleClass, onClick);
    button.setAttribute('data-bs-dismiss', 'modal');
    footerDiv.appendChild(button);
    return this;
  }

  build(): HTMLElement {
    return this.modalElement;
  }

  private createButton(
    label: string,
    className: string,
    onClick: (this: HTMLButtonElement, ev: MouseEvent) => void,
  ): HTMLButtonElement {
    const button = BsElement.button({
      classList: ['btn', className],
      innerText: label,
      eventListener: {
        type: 'click',
        listener: onClick,
      },
    });
    return button;
  }

  private initializeTooltips(element: HTMLElement): void {
    const tooltipElements = element.querySelectorAll(
      "[data-bs-toggle='tooltip']",
    );
    tooltipElements.forEach((tooltipElement) => new Tooltip(tooltipElement));
  }

  private getOrCreateBody(): HTMLElement {
    let bodyDiv = this.modalContent.querySelector<HTMLElement>('.modal-body');
    if (!bodyDiv) {
      bodyDiv = BsElement.modalBody();
      this.modalContent.appendChild(bodyDiv);
    }
    return bodyDiv;
  }

  private getOrCreateFooter(): HTMLElement {
    let footerDiv =
      this.modalContent.querySelector<HTMLElement>('.modal-footer');
    if (!footerDiv) {
      footerDiv = BsElement.modalFooter();
      this.modalContent.appendChild(footerDiv);
    }
    return footerDiv;
  }
}
