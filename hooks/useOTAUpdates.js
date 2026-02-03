/**
 * useOTAUpdates Hook
 * 
 * Checks for OTA updates on app launch and prompts user to reload
 * when a new update is available. This enables instant updates
 * during testing without multiple app restarts.
 */
import { useEffect, useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export function useOTAUpdates() {
    const [isChecking, setIsChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

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

                console.log('[OTA Updates] Update downloaded, prompting user');

                Alert.alert(
                    'Update Available',
                    'A new version has been downloaded. Restart now to apply it?',
                    [
                        {
                            text: 'Later',
                            style: 'cancel',
                            onPress: () => {
                                console.log('[OTA Updates] User deferred update');
                            }
                        },
                        {
                            text: 'Restart Now',
                            style: 'default',
                            onPress: async () => {
                                console.log('[OTA Updates] User accepted, reloading app');
                                await Updates.reloadAsync();
                            }
                        }
                    ],
                    { cancelable: false }
                );
            } else {
                console.log('[OTA Updates] No update available, app is up to date');
            }
        } catch (error) {
            console.warn('[OTA Updates] Error checking for updates:', error.message);
        } finally {
            setIsChecking(false);
        }
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
        checkForUpdates, // Manual trigger if needed
    };
}

export default useOTAUpdates;
