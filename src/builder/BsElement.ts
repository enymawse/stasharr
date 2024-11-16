import { Tooltip } from 'bootstrap';
import { Styles } from '../enums/Styles';
import { Config } from '../models/Config';

export class BsElement {
  static modalFooter(): HTMLElement {
    let footer = document.createElement('div');
    footer.classList.add('modal-footer');
    return footer;
  }
  static modalBody(): HTMLElement {
    let body = document.createElement('div');
    body.classList.add('modal-body');
    return body;
  }

  static button(options?: {
    classList?: string[];
    attributes?: { qualifiedName: string; value: string }[];
    ariaLabel?: string;
    innerText?: string;
    innerHTML?: string;
    eventListener?: {
      // eslint-disable-next-line no-undef
      type: keyof HTMLElementEventMap;
      listener: (this: HTMLButtonElement, ev: MouseEvent) => void;
    };
    style?: { cssText: string };
    id?: string;
  }) {
    let button = document.createElement('button');
    if (options) {
      if (options.ariaLabel) button.ariaLabel = options.ariaLabel;
      if (options.classList) button.classList.add(...options.classList);
      if (options.innerText) button.innerText = options.innerText;
      if (options.innerHTML) button.innerHTML = options.innerHTML;
      if (options.id) button.id = options.id;
      if (options.attributes) {
        options.attributes.forEach((attr) =>
          button.setAttribute(attr.qualifiedName, attr.value),
        );
      }
      if (options.eventListener) {
        button.addEventListener(
          options.eventListener.type,
          // eslint-disable-next-line no-undef
          options.eventListener.listener as EventListener,
        );
      }
      if (options.style && options.style.cssText) {
        button.style.cssText = options.style.cssText;
      }
    }
    return button;
  }

  static floatingInput(options: {
    id: string;
    name: string;
    label: string;
    defaultValue?: string;
    type?: string;
    tooltip?: string;
  }): HTMLElement {
    const formFloat = document.createElement('div');
    formFloat.classList.add('form-floating', 'mb-3');

    const input = document.createElement('input');
    input.type = options.type || 'text';
    input.classList.add('form-control');
    input.id = options.id;
    input.name = options.name;
    input.placeholder = '';
    if (options.defaultValue) input.defaultValue = options.defaultValue;

    if (options.tooltip) {
      input.setAttribute('data-bs-toggle', 'tooltip');
      input.title = options.tooltip;
      new Tooltip(input);
    }

    const label = document.createElement('label');
    label.setAttribute('for', options.id);
    label.innerText = options.label;
    label.style.color = Styles.Color.GRAY;

    formFloat.appendChild(input);
    formFloat.appendChild(label);

    return formFloat;
  }
  static inputSwitch(options: {
    id: string;
    label: string;
    checked?: boolean;
    tooltip?: string;
  }): HTMLElement {
    const formSwitch = document.createElement('div');
    formSwitch.classList.add('form-check', 'form-switch', 'mb-3');

    const input = document.createElement('input');
    input.classList.add('form-check-input');
    input.type = 'checkbox';
    input.role = 'switch';
    input.id = options.id;

    if (options.checked) {
      input.checked = true;
    }

    if (options.tooltip) {
      input.setAttribute('data-bs-toggle', 'tooltip');
      input.title = options.tooltip;
      new Tooltip(input);
    }

    const label = document.createElement('label');
    label.classList.add('form-check-label');
    label.setAttribute('for', options.id);
    label.innerText = options.label;

    formSwitch.appendChild(input);
    formSwitch.appendChild(label);

    return formSwitch;
  }
  static dynamicSelectWithDefault(
    selectId: string,
    defaultValue: number,
    fetchOptions: (config: Config) => Promise<{ id: number; name: string }[]>,
    isValidSettings: (config: Config) => Promise<boolean>,
    config: Config,
    tooltip?: string,
  ): HTMLSelectElement {
    const select = document.createElement('select');
    select.id = selectId;
    select.classList.add('form-select');
    select.disabled = true;

    if (tooltip) {
      select.setAttribute('data-bs-toggle', 'tooltip');
      select.title = tooltip;
      new Tooltip(select);
    }

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Loading options...';
    select.appendChild(defaultOption);

    if (config.whisparrApiKey != '') {
      isValidSettings(config)
        .then((isValid) => {
          if (isValid) {
            select.disabled = false;
            defaultOption.textContent = 'Choose an option';

            fetchOptions(config)
              .then((options) => {
                options.forEach((option) => {
                  const optionElement = document.createElement('option');
                  optionElement.value = option.id + '';
                  optionElement.textContent = option.name;

                  if (defaultValue === option.id) {
                    optionElement.selected = true;
                  }
                  select.appendChild(optionElement);
                });
              })
              .catch((reason) => {
                console.error('Failed to load options:', reason);
                defaultOption.textContent = 'Error loading options';
              });
          } else {
            defaultOption.textContent = 'Invalid settings';
          }
        })
        .catch((reason) => {
          console.log('Settings invalid:', reason);
          defaultOption.textContent = 'Invalid settings';
        });
    } else {
      defaultOption.textContent = 'Configure Domain and API Key';
    }

    return select;
  }
  static staticSelect(
    selectId: string,
    defaultValue: string,
    selectOptions: string[],
  ) {
    const select = document.createElement('select');
    select.id = selectId;
    select.classList.add('form-select');
    selectOptions.forEach((option) => {
      const optionElement = document.createElement('option');
      if (defaultValue === option) {
        optionElement.selected = true;
      }
      optionElement.value = option;
      optionElement.textContent = option;
      select.appendChild(optionElement);
    });
    return select;
  }
}
