/**
 * useOTAUpdates Hook
 * 
 * Facade hook that consumes the global OTAUpdatesContext.
 * Ensures the app shares the same update state across all components.
 */
import { useOTA } from '../contexts/OTAUpdatesContext';

export function useOTAUpdates() {
    const context = useOTA();

    return {
        isChecking: context.isChecking,
        updateAvailable: context.updateAvailable,
        showModal: context.showModal,
        showSuccessModal: context.showSuccessModal,
        handleRestart: context.handleRestart,
        handleLater: context.handleLater,
        handleDismissSuccess: context.handleDismissSuccess,
        checkForUpdates: context.checkForUpdates,
    };
}

export default useOTAUpdates;
