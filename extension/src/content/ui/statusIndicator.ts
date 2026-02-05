import { renderIcon } from './icons.js';
import type { IconName } from './icons.js';

type StatusState = 'loading' | 'in' | 'out' | 'excluded' | 'error' | 'missing';

const STATE_ICON: Record<
  StatusState,
  { icon: IconName; color: string; spin?: boolean }
> = {
  loading: { icon: 'spinner', color: '#7138c8', spin: true },
  in: { icon: 'circle-check', color: '#16a34a' },
  out: { icon: 'download', color: '#7138c8' },
  excluded: { icon: 'ban', color: '#ef4444' },
  error: { icon: 'ban', color: '#ef4444' },
  missing: { icon: 'warning', color: '#f59e0b' },
};

export function createStatusIndicator(options: { state: StatusState }) {
  const overlay = document.createElement('div');
  overlay.className = 'stasharr-scene-card-status';
  overlay.style.position = 'absolute';
  overlay.style.top = '6px';
  overlay.style.right = '6px';
  overlay.style.display = 'inline-flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.width = '26px';
  overlay.style.height = '26px';
  overlay.style.borderRadius = '999px';
  overlay.style.background = 'rgba(15, 23, 42, 0.8)';
  overlay.style.color = '#7138c8';
  overlay.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.35)';

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.style.display = 'inline-flex';
  icon.style.alignItems = 'center';
  icon.style.justifyContent = 'center';
  icon.style.width = '16px';
  icon.style.height = '16px';
  overlay.appendChild(icon);

  const setState = (state: StatusState) => {
    const config = STATE_ICON[state];
    icon.innerHTML = renderIcon(config.icon, { spin: config.spin });
    icon.style.color = config.color;
  };

  setState(options.state);

  return { element: overlay, setState };
}

export type { StatusState };
