import { JSX, Show, splitProps } from 'solid-js';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { Config } from '../../models/Config';

library.add(faExternalLinkAlt);

interface ExternalLinkProps {
  href: string;
  children: JSX.Element;
  config: Config;
  openInNewTab?: boolean; // Override config setting if needed
  showIndicator?: boolean; // Show visual indicator for new tab
  class?: string;
  'data-bs-toggle'?: string;
  'data-bs-title'?: string;
  'data-bs-placement'?: string;
  onclick?: (e: MouseEvent) => void;
}

const ExternalLink = (props: ExternalLinkProps) => {
  const [local, others] = splitProps(props, [
    'href',
    'children',
    'config',
    'openInNewTab',
    'showIndicator',
  ]);

  const shouldOpenInNewTab = () => {
    return local.openInNewTab ?? local.config.openLinksInNewTab;
  };

  const getLinkAttributes = () => {
    const baseAttrs = {
      href: local.href,
      ...others,
    };

    if (shouldOpenInNewTab()) {
      return {
        ...baseAttrs,
        target: '_blank',
        rel: 'noopener noreferrer',
      };
    }

    return baseAttrs;
  };

  const showVisualIndicator = () => {
    return local.showIndicator !== false && shouldOpenInNewTab();
  };

  return (
    <a {...getLinkAttributes()}>
      {local.children}
      <Show when={showVisualIndicator()}>
        {' '}
        <span
          style={{ opacity: 0.7, 'font-size': '0.75em' }}
          title="Opens in new tab"
        >
          <FontAwesomeIcon icon="fa-solid fa-external-link-alt" />
        </span>
      </Show>
    </a>
  );
};

export default ExternalLink;
