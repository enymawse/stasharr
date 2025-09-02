import { For, Show } from 'solid-js';
import { Modal, Button, ProgressBar, Alert } from 'solid-bootstrap';
import { FontAwesomeIcon } from 'solid-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faClock,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faTasks,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

library.add(
  faClock,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faTasks,
  faExclamationTriangle,
);

export interface ProgressItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}

interface ProgressModalProps {
  show: boolean;
  title: string;
  items: ProgressItem[];
  onClose: () => void;
  isComplete: boolean;
  skippedCount?: number;
  skippedReason?: string;
  infoMessage?: string;
}

const ProgressModal = (props: ProgressModalProps) => {
  const totalItems = () => props.items.length;
  const completedItems = () =>
    props.items.filter(
      (item) => item.status === 'success' || item.status === 'error',
    ).length;
  const successCount = () =>
    props.items.filter((item) => item.status === 'success').length;
  const errorCount = () =>
    props.items.filter((item) => item.status === 'error').length;
  const progressPercentage = () =>
    totalItems() > 0 ? (completedItems() / totalItems()) * 100 : 0;

  const getStatusIcon = (status: ProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return { icon: 'fa-solid fa-clock', class: 'text-muted' };
      case 'processing':
        return { icon: 'fa-solid fa-spinner fa-spin', class: 'text-primary' };
      case 'success':
        return { icon: 'fa-solid fa-check-circle', class: 'text-success' };
      case 'error':
        return { icon: 'fa-solid fa-exclamation-circle', class: 'text-danger' };
    }
  };

  const isEmpty = () => totalItems() === 0;

  return (
    <Modal show={props.show} onHide={props.onClose} size="lg" centered>
      <Modal.Header closeButton={props.isComplete}>
        <Modal.Title>
          <span class="me-2">
            <FontAwesomeIcon icon="fa-solid fa-tasks" />
          </span>
          {props.title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Overall Progress */}
        <Show when={!isEmpty()}>
          <div class="mb-4">
            <div class="d-flex justify-content-between mb-2">
              <span>
                Progress: {completedItems()}/{totalItems()}
              </span>
              <span>{Math.round(progressPercentage())}%</span>
            </div>
            <ProgressBar
              now={progressPercentage()}
              variant={errorCount() > 0 ? 'warning' : 'success'}
              style={{ height: '8px' }}
            />
          </div>
        </Show>

        {/* Summary Stats */}
        <Show when={!isEmpty()}>
          <div class="row mb-3">
            <div class="col-4 text-center">
              <div class="text-success fs-5">{successCount()}</div>
              <small class="text-muted">Success</small>
            </div>
            <div class="col-4 text-center">
              <div class="text-danger fs-5">{errorCount()}</div>
              <small class="text-muted">Failed</small>
            </div>
            <div class="col-4 text-center">
              <div class="text-muted fs-5">
                {totalItems() - completedItems()}
              </div>
              <small class="text-muted">Remaining</small>
            </div>
          </div>
        </Show>

        {/* Empty state message */}
        <Show when={isEmpty() && props.infoMessage}>
          <Alert variant="info" class="py-2 mb-3">
            <span class="me-2">
              <FontAwesomeIcon icon="fa-solid fa-exclamation-triangle" />
            </span>
            {props.infoMessage}
          </Alert>
        </Show>

        {/* Skipped Info (visible during progress and on completion) */}
        <Show when={props.skippedCount && props.skippedCount > 0}>
          <Alert variant="info" class="py-2 mb-3">
            <span class="me-2">
              <FontAwesomeIcon icon="fa-solid fa-exclamation-triangle" />
            </span>
            Skipped: {props.skippedCount}
            {props.skippedReason ? ` (${props.skippedReason})` : ''}
          </Alert>
        </Show>

        {/* Items List */}
        <Show when={!isEmpty()}>
          <div style={{ 'max-height': '300px', overflow: 'auto' }}>
            <For each={props.items}>
              {(item) => {
                const statusIcon = getStatusIcon(item.status);
                return (
                  <div class="d-flex align-items-center mb-2 p-2 rounded border">
                    <div class="me-3">
                      <span class={statusIcon.class}>
                        <FontAwesomeIcon icon={statusIcon.icon} />
                      </span>
                    </div>
                    <div class="flex-grow-1">
                      <div class="fw-medium">{item.name}</div>
                      <Show when={item.message}>
                        <small class="text-muted">{item.message}</small>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Completion Message */}
        <Show when={props.isComplete}>
          <Alert
            variant={errorCount() > 0 ? 'warning' : 'success'}
            class="mt-3"
          >
            <span class="me-2">
              <FontAwesomeIcon
                icon={
                  errorCount() > 0
                    ? 'fa-solid fa-exclamation-triangle'
                    : 'fa-solid fa-check-circle'
                }
              />
            </span>
            Operation completed! {successCount()} succeeded, {errorCount()}{' '}
            failed
            {props.skippedCount && props.skippedCount > 0
              ? `, ${props.skippedCount} skipped (${props.skippedReason})`
              : ''}
            .
          </Alert>
        </Show>
      </Modal.Body>

      <Modal.Footer>
        <Show when={props.isComplete}>
          <Button variant="primary" onClick={props.onClose}>
            Close
          </Button>
        </Show>
      </Modal.Footer>
    </Modal>
  );
};

export default ProgressModal;
