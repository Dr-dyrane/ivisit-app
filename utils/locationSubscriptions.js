import { Platform } from "react-native";

export function safeRemoveLocationSubscription(subscription, label = "location") {
	if (!subscription || typeof subscription.remove !== "function") {
		return;
	}

	if (Platform.OS === "web") {
		// Expo Location's web shim can throw through EventEmitter cleanup during reloads.
		return;
	}

	try {
		subscription.remove();
	} catch (error) {
		if (__DEV__) {
			console.warn(
				`[LocationSubscription] Failed to remove ${label} subscription:`,
				error?.message || error
			);
		}
	}
}
