import { renderIcon } from './icons.js';
import type { IconName } from './icons.js';

type ButtonVariant =
  | 'action'
  | 'view-whisparr'
  | 'view-stash'
  | 'search'
  | 'exclude'
  | 'monitor';

const VARIANT_STYLES: Record<
  ButtonVariant,
  {
    borderColor: string;
    background: string;
    padding: string;
    gap?: string;
  }
> = {
  action: {
    borderColor: '#c084fc',
    background: '#c084fc',
    padding: '2px 8px',
    gap: '4px',
  },
  'view-whisparr': {
    borderColor: '#7138C8',
    background: '#7138C8',
    padding: '2px',
  },
  'view-stash': {
    borderColor: '#137cbd',
    background: '#137cbd',
    padding: '2px',
  },
  search: {
    borderColor: '#00853d',
    background: '#00853d',
    padding: '2px 8px',
  },
  exclude: {
    borderColor: '#c4273c',
    background: '#c4273c',
    padding: '2px 8px',
  },
  monitor: {
    borderColor: '#c4337c',
    background: '#c4337c',
    padding: '2px 8px',
  },
};

type ButtonState = 'enabled' | 'disabled';

export function createIconButton(options: {
  label: string;
  icon: IconName;
  variant: ButtonVariant;
  disabled?: boolean;
  title?: string;
  iconSize?: number;
}) {
  const { label, icon, variant, disabled = false, title, iconSize } = options;
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  if (title) {
    button.title = title;
  }
  const styles = VARIANT_STYLES[variant];
  button.style.border = `1px solid ${styles.borderColor}`;
  button.style.borderRadius = '999px';
  button.style.padding = styles.padding;
  button.style.background = styles.background;
  button.style.color = '#ffffff';
  button.style.fontSize = '12px';
  button.style.lineHeight = '1';
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  if (styles.gap) {
    button.style.gap = styles.gap;
  }
  button.innerHTML = renderIcon(icon, { size: iconSize });
  setButtonState(button, disabled ? 'disabled' : 'enabled');
  return button;
}

export function setButtonState(button: HTMLButtonElement, state: ButtonState) {
  const disabled = state === 'disabled';
  button.disabled = disabled;
  if (disabled) {
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
  } else {
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }
}

export type { ButtonVariant, ButtonState };
