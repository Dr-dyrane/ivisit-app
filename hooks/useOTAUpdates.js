/**
 * useOTAUpdates Hook
 * 
 * Checks for OTA updates on app launch and exposes state
 * for the UpdateAvailableModal to display.
 * [OTA-UPDATE-REDESIGN] Custom premium modal instead of system Alert
 */
import { useEffect, useCallback, useState } from 'react';
import * as Updates from 'expo-updates';

export function useOTAUpdates() {
    const [isChecking, setIsChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [showModal, setShowModal] = useState(false); // [OTA-UPDATE-REDESIGN] Controlled via custom modal state

    const checkForUpdates = useCallback(async () => {
        // Skip in development mode - Updates API not available
        if (__DEV__) {
            console.log('[OTA Updates] Skipping check in development mode');
            return;
        }

        try {
            setIsChecking(true);
            console.log('[OTA Updates] Checking for updates...');

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                console.log('[OTA Updates] Update available, downloading...');
                setUpdateAvailable(true);

                await Updates.fetchUpdateAsync();

                console.log('[OTA Updates] Update downloaded, showing modal');
                setShowModal(true);
            } else {
                console.log('[OTA Updates] No update available, app is up to date');
            }
        } catch (error) {
            console.warn('[OTA Updates] Error checking for updates:', error.message);
        } finally {
            setIsChecking(false);
        }
    }, []);

    const handleRestart = useCallback(async () => {
        console.log('[OTA Updates] User accepted, reloading app');
        setShowModal(false);
        await Updates.reloadAsync();
    }, []);

    const handleLater = useCallback(() => {
        console.log('[OTA Updates] User deferred update');
        setShowModal(false);
    }, []);

    // Check for updates on mount
    useEffect(() => {
        // Small delay to let the app fully initialize first
        const timer = setTimeout(() => {
            checkForUpdates();
        }, 2000);

        return () => clearTimeout(timer);
    }, [checkForUpdates]);

    return {
        isChecking,
        updateAvailable,
        showModal,
        handleRestart,
        handleLater,
        checkForUpdates, // Manual trigger if needed
    };
}

export default useOTAUpdates;
