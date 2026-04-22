import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import * as Updates from 'expo-updates';
import { database } from '../database/db';

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
                const pending = await database.readRaw(UPDATE_PENDING_KEY, null, { parseJson: false });
                if (pending === 'true' && isMounted) {
                    await database.deleteRaw(UPDATE_PENDING_KEY);
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
            return;
        }

        try {
            setIsChecking(true);

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                setUpdateAvailable(true);
                await Updates.fetchUpdateAsync();
                setShowModal(true);
            }
        } catch (error) {
            console.warn('[OTA Updates] Error checking for updates:', error.message);
        } finally {
            setIsChecking(false);
        }
    }, []);

    const handleRestart = useCallback(async () => {
        setShowModal(false);

        try {
            await database.writeRaw(UPDATE_PENDING_KEY, 'true', { stringifyJson: false });
        } catch (error) {
            console.warn('[OTA Updates] Error storing update pending flag:', error.message);
        }

        await Updates.reloadAsync();
    }, []);

    const handleLater = useCallback(() => {
        setShowModal(false);
    }, []);

    const handleDismissSuccess = useCallback(() => {
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
