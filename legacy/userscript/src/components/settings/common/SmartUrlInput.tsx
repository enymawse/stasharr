import { createSignal, createMemo, Show, For, onMount } from 'solid-js';
import { UrlProcessor, UrlValidationResult } from '../../../util/urlProcessor';

interface SmartUrlInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  serviceType: 'stash' | 'whisparr';
  useHttps?: boolean;
  placeholder?: string;
  id: string;
  required?: boolean;
}

const SmartUrlInput = (props: SmartUrlInputProps) => {
  const [showExamples, setShowExamples] = createSignal(false);

  const validation = createMemo((): UrlValidationResult => {
    if (!props.value || props.value.trim() === '') {
      return {
        isValid: false,
        suggestions: [],
        warnings: [],
        errors: props.required ? ['This field is required'] : [],
      };
    }

    return UrlProcessor.validateUrl(
      props.value,
      props.serviceType,
      props.useHttps,
    );
  });

  const statusClass = createMemo(() => {
    if (!props.value || props.value.trim() === '') {
      return '';
    }
    if (validation().isValid) {
      return validation().warnings.length > 0
        ? 'is-valid border-warning'
        : 'is-valid';
    }
    return 'is-invalid';
  });

  const examples = createMemo(() =>
    UrlProcessor.getExamples(props.serviceType),
  );

  const previewUrls = createMemo(() => {
    const result = validation();
    if (!result.isValid || !result.processedUrl) {
      return null;
    }

    const urls: { label: string; url: string }[] = [];

    if (props.serviceType === 'stash') {
      urls.push({
        label: 'GraphQL Endpoint',
        url: UrlProcessor.buildStashGraphqlUrl(result.processedUrl.fullBaseUrl),
      });
      urls.push({
        label: 'Scene URL Example',
        url: UrlProcessor.buildStashSceneUrl(
          result.processedUrl.fullBaseUrl,
          '{scene-id}',
        ),
      });
    } else {
      urls.push({
        label: 'Base URL',
        url: result.processedUrl.fullBaseUrl,
      });
      urls.push({
        label: 'API Endpoint',
        url: UrlProcessor.buildWhisparrApiUrl(result.processedUrl.fullBaseUrl),
      });
      urls.push({
        label: 'Movie URL Example',
        url: UrlProcessor.buildWhisparrMovieUrl(
          result.processedUrl.fullBaseUrl,
          '{stash-id}',
        ),
      });
    }

    return urls;
  });

  const handleSuggestionClick = (suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/^Try: /, '');
    props.onChange(cleanSuggestion);
  };

  const toggleExamples = () => {
    setShowExamples(!showExamples());
  };

  onMount(() => {
    // Add tooltips if available
    const element = document.getElementById(props.id);
    if (element && typeof window !== 'undefined' && 'bootstrap' in window) {
      const bootstrap = (
        window as typeof window & {
          bootstrap: { Tooltip: new (element: Element) => void };
        }
      ).bootstrap;
      new bootstrap.Tooltip(element);
    }
  });

  return (
    <div class="mb-3">
      {/* Main Input */}
      <div class="form-floating">
        <input
          class={`form-control ${statusClass()}`}
          id={props.id}
          type="text"
          placeholder={props.placeholder || ''}
          value={props.value}
          onInput={(e) => props.onChange(e.target.value)}
          required={props.required}
        />
        <label for={props.id}>{props.label}</label>

        {/* Status Icon */}
        <Show when={props.value && props.value.trim() !== ''}>
          <div class="position-absolute top-50 end-0 translate-middle-y me-3">
            <Show
              when={validation().isValid}
              fallback={
                <i
                  class="fas fa-exclamation-triangle text-danger"
                  title="Invalid URL"
                ></i>
              }
            >
              <Show
                when={validation().warnings.length === 0}
                fallback={
                  <i
                    class="fas fa-exclamation-triangle text-warning"
                    title="Valid with warnings"
                  ></i>
                }
              >
                <i
                  class="fas fa-check-circle text-success"
                  title="Valid URL"
                ></i>
              </Show>
            </Show>
          </div>
        </Show>
      </div>

      {/* Validation Messages */}
      <Show when={validation().errors.length > 0}>
        <div class="invalid-feedback d-block">
          <For each={validation().errors}>{(error) => <div>{error}</div>}</For>
        </div>
      </Show>

      <Show when={validation().warnings.length > 0}>
        <div class="text-warning small mt-1">
          <For each={validation().warnings}>
            {(warning) => (
              <div>
                <i class="fas fa-info-circle"></i> {warning}
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* URL Preview */}
      <Show when={validation().isValid && previewUrls()}>
        <div class="mt-2 p-2 bg-light rounded small">
          <div class="fw-bold text-success mb-1">
            <i class="fas fa-link"></i> URL Preview
          </div>
          <For each={previewUrls()}>
            {(urlInfo) => (
              <div class="text-muted">
                <span class="fw-medium">{urlInfo.label}:</span>
                <code class="ms-1">{urlInfo.url}</code>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Suggestions */}
      <Show when={validation().suggestions.length > 0}>
        <div class="mt-2">
          <div class="small text-muted mb-1">Suggestions:</div>
          <For each={validation().suggestions}>
            {(suggestion) => (
              <button
                type="button"
                class="btn btn-sm btn-outline-primary me-2 mb-1"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Examples */}
      <div class="mt-2">
        <button
          type="button"
          class="btn btn-link btn-sm p-0 text-decoration-none"
          onClick={toggleExamples}
        >
          <i class={`fas fa-chevron-${showExamples() ? 'up' : 'down'}`}></i>
          {showExamples() ? ' Hide' : ' Show'} examples
        </button>

        <Show when={showExamples()}>
          <div class="mt-2 p-2 bg-light rounded small">
            <div class="fw-bold mb-1">Example formats:</div>
            <For each={examples()}>
              {(example) => (
                <div>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 text-start"
                    onClick={() => props.onChange(example)}
                  >
                    <code>{example}</code>
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SmartUrlInput;
