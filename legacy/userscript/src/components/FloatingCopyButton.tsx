import { createSignal, Show } from 'solid-js';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Stasharr } from '../enums/Stasharr';

library.add(faCopy, faCheck);

interface FloatingCopyButtonProps {
  textToCopy: string;
}

const FloatingCopyButton = (props: FloatingCopyButtonProps) => {
  const [copied, setCopied] = createSignal(false);

  const handleClick = async () => {
    try {
      // eslint-disable-next-line no-undef
      await GM_setClipboard(props.textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <button
      type="button"
      class="btn btn-primary"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        'z-index': 1050,
        'border-radius': '50%',
        width: '50px',
        height: '50px',
        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: 'none',
      }}
      onClick={handleClick}
      title={copied() ? 'Copied!' : `Copy Stash ID: ${props.textToCopy}`}
      data-bs-toggle="tooltip"
      id={Stasharr.ID.FloatingCopyButton}
    >
      <Show
        when={copied()}
        fallback={<FontAwesomeIcon icon="fa-solid fa-copy" />}
      >
        <FontAwesomeIcon icon="fa-solid fa-check" />
      </Show>
    </button>
  );
};

export default FloatingCopyButton;
