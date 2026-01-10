import { useState, useEffect, useRef } from "react";
import { pushNotificationService } from "../../services/pushNotificationService";
import * as Notifications from "expo-notifications";

/**
 * usePushNotifications Hook
 * Manages push notification registration and listeners.
 */
export const usePushNotifications = () => {
	const [expoPushToken, setExpoPushToken] = useState(null);
	const [notification, setNotification] = useState(null);
	const notificationListener = useRef();
	const responseListener = useRef();

	useEffect(() => {
		// 1. Register for push notifications
		pushNotificationService.registerForPushNotificationsAsync().then((token) => {
			setExpoPushToken(token);
            // TODO: Send token to backend/user profile here if authenticated
		});

		// 2. Set up listeners
		notificationListener.current =
			pushNotificationService.addNotificationReceivedListener((notification) => {
				setNotification(notification);
			});

		responseListener.current =
			pushNotificationService.addNotificationResponseReceivedListener(
				(response) => {
					console.log("Notification Response:", response);
                    // Handle deep linking or navigation here if needed
				}
			);

		return () => {
			pushNotificationService.removeSubscription(notificationListener.current);
			pushNotificationService.removeSubscription(responseListener.current);
		};
	}, []);

	return {
		expoPushToken,
		notification,
	};
};
