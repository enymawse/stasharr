type IconName =
  | 'spinner'
  | 'circle-check'
  | 'copy'
  | 'download'
  | 'ban'
  | 'warning'
  | 'refresh'
  | 'x'
  | 'search'
  | 'external-link'
  | 'bookmark'
  | 'bookmark-filled';

const ICON_PATHS: Record<IconName, string> = {
  spinner: 'M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7V2z',
  'circle-check':
    'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm5 7-6 6-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9z',
  copy: 'M9 9h10v10H9z M5 5h10v10H5z',
  download: 'M12 3v9m0 0 4-4m-4 4-4-4M5 19h14',
  ban: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-6.2 5.8L18.2 18.2M18.2 5.8 5.8 18.2',
  warning:
    'M12 3 1.5 21h21L12 3zm0 5.5 3.5 7H8.5L12 8.5zm-1 9.5h2v2h-2v-2z',
  refresh:
    'M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.2L14 10h6V4l-2.3 2.3z',
  x: 'M6 6l12 12M18 6L6 18',
  search:
    'M21 21l-4.3-4.3m1.3-5A7 7 0 1 1 10 4a7 7 0 0 1 8 7.7z',
  'external-link': 'M14 3h7v7m0-7L10 14M5 7v12h12',
  bookmark: 'M6 4h12v16l-6-4-6 4V4z',
  'bookmark-filled': 'M6 4h12v16l-6-4-6 4V4z',
};

let iconStylesInjected = false;

function ensureIconStyles() {
  if (iconStylesInjected) return;
  if (document.getElementById('stasharr-fa-style')) {
    iconStylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'stasharr-fa-style';
  style.textContent =
    '@keyframes stasharr-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
  iconStylesInjected = true;
}

export function renderIcon(
  name: IconName,
  options?: { size?: number; spin?: boolean },
): SVGSVGElement {
  ensureIconStyles();
  const size = options?.size ?? 14;
  const spinStyle = options?.spin
    ? 'stasharr-spin 1s linear infinite'
    : '';
  const strokeIcons =
    name === 'copy' ||
    name === 'download' ||
    name === 'ban' ||
    name === 'refresh' ||
    name === 'x' ||
    name === 'search' ||
    name === 'external-link' ||
    name === 'bookmark';
  const path = ICON_PATHS[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.display = 'block';
  svg.style.color = 'currentColor';
  if (spinStyle) {
    svg.style.animation = spinStyle;
  }
  if (strokeIcons) {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  } else {
    svg.setAttribute('fill', 'currentColor');
  }
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', path);
  svg.appendChild(pathEl);
  return svg;
}

export type { IconName };
