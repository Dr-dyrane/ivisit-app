import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { database } from '../database/db';

const OTAUpdatesContext = createContext(null);

const UPDATE_PENDING_KEY = '@ivisit/update_pending';
const UPDATE_CHECK_THROTTLE_MS = 15 * 60 * 1000;

// expo-updates exposes createdAt on the modern manifest format and publishedTime on the classic one.
const readIncomingManifest = (manifest) => ({
    id: typeof manifest?.id === 'string' ? manifest.id : null,
    createdAt: manifest?.createdAt ?? manifest?.publishedTime ?? null,
});

export const OTAUpdatesProvider = ({ children }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [availableUpdate, setAvailableUpdate] = useState(null);

    const checkInflightRef = useRef(false);
    const lastCheckAtRef = useRef(0);
    const surfacedUpdateIdRef = useRef(null);

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

        if (checkInflightRef.current) {
            return;
        }

        checkInflightRef.current = true;
        // Stamp the attempt, not the outcome, so repeated foregrounds cannot hammer the server.
        lastCheckAtRef.current = Date.now();

        try {
            setIsChecking(true);

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                const incoming = readIncomingManifest(update.manifest);

                // Never re-open the sheet for an update the user already dismissed.
                if (incoming.id && incoming.id === surfacedUpdateIdRef.current) {
                    return;
                }

                setUpdateAvailable(true);
                await Updates.fetchUpdateAsync();
                surfacedUpdateIdRef.current = incoming.id;
                setAvailableUpdate(incoming);
                setShowModal(true);
            }
        } catch (error) {
            console.warn('[OTA Updates] Error checking for updates:', error.message);
        } finally {
            checkInflightRef.current = false;
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

    // Re-check on foreground: the mount check alone never reaches a long-lived session.
    useEffect(() => {
        if (__DEV__) {
            return undefined;
        }

        const subscription = AppState.addEventListener('change', (status) => {
            if (status !== 'active') return;
            if (Date.now() - lastCheckAtRef.current < UPDATE_CHECK_THROTTLE_MS) return;
            checkForUpdates();
        });

        return () => subscription.remove();
    }, [checkForUpdates]);

    const value = {
        isChecking,
        updateAvailable,
        availableUpdate,
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
