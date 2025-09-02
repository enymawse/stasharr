import { createStore } from 'solid-js/store';
import { SettingsContext } from '../contexts/useSettings';
import { Config } from '../models/Config';
import BulkActionDropdown from './BulkActionDropdown';
import ProgressModal from './ProgressModal';
import FeedbackService from '../service/FeedbackService';

const SceneList = (props: { config: Config }) => {
  const [store, setStore] = createStore(props.config);

  const feedbackState = FeedbackService.getFeedbackState();

  return (
    <SettingsContext.Provider value={{ store, setStore }}>
      <div class="d-flex justify-content-end">
        <BulkActionDropdown />
      </div>

      <ProgressModal
        show={feedbackState().showProgressModal}
        title={feedbackState().modalTitle}
        items={feedbackState().progressItems}
        isComplete={feedbackState().isComplete}
        skippedCount={feedbackState().skippedCount}
        skippedReason={feedbackState().skippedReason}
        infoMessage={feedbackState().infoMessage}
        onClose={() => FeedbackService.closeProgressModal()}
      />
    </SettingsContext.Provider>
  );
};

export default SceneList;
