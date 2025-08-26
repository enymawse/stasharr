import { createSignal, Show } from 'solid-js';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

library.add(faCopy, faCheck);

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  style?: string;
  tooltip?: string;
}

const CopyButton = (props: CopyButtonProps) => {
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
      class={props.className || 'btn btn-sm btn-outline-secondary'}
      style={props.style}
      onClick={handleClick}
      title={props.tooltip || `Copy ${props.textToCopy}`}
      data-bs-toggle="tooltip"
    >
      <Show
        when={copied()}
        fallback={<FontAwesomeIcon icon="fa-solid fa-copy" />}
      >
        <FontAwesomeIcon icon="fa-solid fa-check" />
      </Show>
      <span class="ms-1">
        <Show when={copied()} fallback="Copy ID">
          Copied!
        </Show>
      </span>
    </button>
  );
};

export default CopyButton;
