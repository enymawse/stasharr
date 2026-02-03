import { createSignal, Show } from 'solid-js';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

library.add(faCopy, faCheck);

interface CopyCardButtonProps {
  stashId: string;
}

const CopyCardButton = (props: CopyCardButtonProps) => {
  const [copied, setCopied] = createSignal(false);

  const handleClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // eslint-disable-next-line no-undef
      await GM_setClipboard(props.stashId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <button
      type="button"
      class="copy-card-button"
      onClick={handleClick}
      title={copied() ? 'Copied!' : `Copy Stash ID: ${props.stashId}`}
      data-bs-toggle="tooltip"
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

export default CopyCardButton;
