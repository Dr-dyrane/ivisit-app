import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OTAUpdatesContext = createContext(null);

const UPDATE_PENDING_KEY = '@ivisit/update_pending';

export const OTAUpdatesProvider = ({ children }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Check if we just applied an update (runs once on mount)
    useEffect(() => {
        let isMounted = true;
        let successTimer = null;

        const checkPendingUpdate = async () => {
            if (__DEV__) return;

            try {
                const pending = await AsyncStorage.getItem(UPDATE_PENDING_KEY);
                if (pending === 'true' && isMounted) {
                    console.log('[OTA Updates] Update was applied, showing success modal');
                    await AsyncStorage.removeItem(UPDATE_PENDING_KEY);
                    successTimer = setTimeout(() => {
                        if (isMounted) {
                            setShowSuccessModal(true);
                        }
                    }, 1000);
                }
            } catch (error) {
                console.warn('[OTA Updates] Error checking pending update flag:', error.message);
            }
        };

        checkPendingUpdate();

        return () => {
            isMounted = false;
            if (successTimer) clearTimeout(successTimer);
        };
    }, []);

    const checkForUpdates = useCallback(async () => {
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
        console.log('[OTA Updates] User accepted, storing flag and reloading app');
        setShowModal(false);

        try {
            await AsyncStorage.setItem(UPDATE_PENDING_KEY, 'true');
        } catch (error) {
            console.warn('[OTA Updates] Error storing update pending flag:', error.message);
        }

        await Updates.reloadAsync();
    }, []);

    const handleLater = useCallback(() => {
        console.log('[OTA Updates] User deferred update');
        setShowModal(false);
    }, []);

    const handleDismissSuccess = useCallback(() => {
        console.log('[OTA Updates] User dismissed success modal');
        setShowSuccessModal(false);
    }, []);



    // Check for updates on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            checkForUpdates();
        }, 2000);

        return () => clearTimeout(timer);
    }, [checkForUpdates]);

    const value = {
        isChecking,
        updateAvailable,
        showModal,
        showSuccessModal,
        handleRestart,
        handleLater,
        handleDismissSuccess,
        checkForUpdates,
        setShowModal,
        setShowSuccessModal,
    };

    return (
        <OTAUpdatesContext.Provider value={value}>
            {children}
        </OTAUpdatesContext.Provider>
    );
};

export const useOTA = () => {
    const context = useContext(OTAUpdatesContext);
    if (!context) {
        throw new Error('useOTA must be used within an OTAUpdatesProvider');
    }
    return context;
};
