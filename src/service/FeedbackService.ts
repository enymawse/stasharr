import { createSignal } from 'solid-js';
import { ProgressItem } from '../components/ProgressModal';
import ToastService from './ToastService';

export interface FeedbackState {
  showProgressModal: boolean;
  modalTitle: string;
  progressItems: ProgressItem[];
  isComplete: boolean;
  skippedCount?: number;
  skippedReason?: string;
  infoMessage?: string;
}

// Global feedback state
const [feedbackState, setFeedbackState] = createSignal<FeedbackState>({
  showProgressModal: false,
  modalTitle: '',
  progressItems: [],
  isComplete: false,
});

export default class FeedbackService {
  private static buttonStates = new Map<
    string,
    { originalHTML: string; isActive: boolean }
  >();

  // Get the current feedback state (reactive)
  static getFeedbackState() {
    return feedbackState;
  }

  // Start a bulk operation with progress tracking
  static startBulkOperation(
    title: string,
    items: { id: string; name: string }[],
  ) {
    const progressItems: ProgressItem[] = items.map((item) => ({
      ...item,
      status: 'pending' as const,
    }));

    setFeedbackState({
      showProgressModal: true,
      modalTitle: title,
      progressItems,
      isComplete: false,
      infoMessage: undefined,
    });

    return {
      updateItem: this.updateProgressItem.bind(this),
      complete: this.completeBulkOperation.bind(this),
      addItems: this.addProgressItems.bind(this),
      removeItem: this.removeProgressItem.bind(this),
      updateItemName: this.updateProgressItemName.bind(this),
      updateItemNames: this.updateProgressItemNames.bind(this),
      setInfo: this.setInfoMessage.bind(this),
      setSkippedInfo: this.setSkippedInfo.bind(this),
    };
  }

  // Update a specific item's status
  static updateProgressItem(
    id: string,
    status: ProgressItem['status'],
    message?: string,
  ) {
    setFeedbackState((prev) => ({
      ...prev,
      progressItems: prev.progressItems.map((item) =>
        item.id === id ? { ...item, status, message } : item,
      ),
    }));
  }

  // Add new items to an existing bulk operation
  static addProgressItems(items: { id: string; name: string }[]) {
    const newProgressItems: ProgressItem[] = items.map((item) => ({
      ...item,
      status: 'pending' as const,
    }));

    setFeedbackState((prev) => ({
      ...prev,
      progressItems: [...prev.progressItems, ...newProgressItems],
    }));
  }

  // Update the display name of a specific progress item
  static updateProgressItemName(id: string, name: string) {
    setFeedbackState((prev) => ({
      ...prev,
      progressItems: prev.progressItems.map((item) =>
        item.id === id ? { ...item, name } : item,
      ),
    }));
  }

  // Bulk update display names for multiple items
  static updateProgressItemNames(items: { id: string; name: string }[]) {
    const nameMap = new Map(items.map((i) => [i.id, i.name] as const));
    setFeedbackState((prev) => ({
      ...prev,
      progressItems: prev.progressItems.map((item) =>
        nameMap.has(item.id) ? { ...item, name: nameMap.get(item.id)! } : item,
      ),
    }));
  }

  // Remove a specific progress item
  static removeProgressItem(itemId: string) {
    setFeedbackState((prev) => ({
      ...prev,
      progressItems: prev.progressItems.filter((item) => item.id !== itemId),
    }));
  }

  // Set an informational message for empty-state or general info
  static setInfoMessage(message?: string) {
    setFeedbackState((prev) => ({
      ...prev,
      infoMessage: message,
    }));
  }

  // Set information about skipped items
  static setSkippedInfo(count: number, reason: string) {
    setFeedbackState((prev) => ({
      ...prev,
      skippedCount: count,
      skippedReason: reason,
    }));
  }

  // Mark the bulk operation as complete
  static completeBulkOperation() {
    setFeedbackState((prev) => ({
      ...prev,
      isComplete: true,
    }));
  }

  // Close the progress modal
  static closeProgressModal() {
    setFeedbackState((prev) => ({
      ...prev,
      showProgressModal: false,
    }));
  }

  // Start an operation on a button
  static startButtonOperation(buttonId: string, operationText: string) {
    const button = document.querySelector(`#${buttonId}`) as HTMLElement;
    if (!button) return;

    // Store original state if not already stored
    if (!this.buttonStates.has(buttonId)) {
      this.buttonStates.set(buttonId, {
        originalHTML: button.innerHTML,
        isActive: false,
      });
    }

    const state = this.buttonStates.get(buttonId)!;
    state.isActive = true;
    button.textContent = operationText;
  }

  // Complete an operation on a button
  static completeButtonOperation(
    buttonId: string,
    completionText?: string,
    duration = 3000,
  ) {
    const button = document.querySelector(`#${buttonId}`) as HTMLElement;
    const state = this.buttonStates.get(buttonId);
    if (!button || !state || !state.isActive) return;

    if (completionText) {
      // Show completion text briefly, then restore
      button.textContent = completionText;
      setTimeout(() => {
        if (state.isActive) {
          button.innerHTML = state.originalHTML;
          state.isActive = false;
        }
      }, duration);
    } else {
      // Restore immediately
      button.innerHTML = state.originalHTML;
      state.isActive = false;
    }
  }

  // Legacy method for backward compatibility - now maps to state-driven approach
  static updateButtonStatus(
    buttonId: string,
    newText: string,
    duration: number = 3000,
  ) {
    // If this is a completion message (contains numbers/results), treat as completion
    if (
      /\d/.test(newText) &&
      (newText.includes('Added') ||
        newText.includes('Searched') ||
        newText.includes('Failed'))
    ) {
      this.completeButtonOperation(buttonId, newText, duration);
    } else {
      // Otherwise treat as starting an operation
      this.startButtonOperation(buttonId, newText);
    }
  }

  // Show persistent error (keeps toasts for errors)
  static showError(message: string) {
    ToastService.showPersistentToast(message, false);
  }

  // Show quick success feedback (auto-dismiss)
  static showSuccess(message: string) {
    ToastService.showToast(message, true);
  }

  // Update scene card status (in-context feedback)
  static updateSceneCard(
    sceneId: string,
    status: 'processing' | 'success' | 'error',
  ) {
    const sceneCard = document.querySelector(
      `[data-scene-id="${sceneId}"]`,
    ) as HTMLElement;
    if (!sceneCard) return;

    // Remove existing status classes
    sceneCard.classList.remove(
      'scene-processing',
      'scene-success',
      'scene-error',
    );

    // Add new status class
    sceneCard.classList.add(`scene-${status}`);

    // Add visual indicator
    let indicator = sceneCard.querySelector(
      '.scene-status-indicator',
    ) as HTMLElement;
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className =
        'scene-status-indicator position-absolute top-0 end-0 m-2';
      sceneCard.style.position = 'relative';
      sceneCard.appendChild(indicator);
    }

    const icons = {
      processing: '<i class="fa-solid fa-spinner fa-spin text-primary"></i>',
      success: '<i class="fa-solid fa-check-circle text-success"></i>',
      error: '<i class="fa-solid fa-exclamation-circle text-danger"></i>',
    };

    indicator.innerHTML = icons[status];

    // Auto-remove success indicators after 5 seconds
    if (status === 'success') {
      setTimeout(() => {
        if (indicator && indicator.parentNode) {
          indicator.remove();
          sceneCard.classList.remove('scene-success');
        }
      }, 5000);
    }
  }

  // Browser notification for important operations (requires permission)
  static async showNotification(title: string, message: string) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: '/favicon.ico',
          });
        }
      }
    }
  }
}
