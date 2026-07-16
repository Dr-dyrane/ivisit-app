// react-native-web ships Alert as a no-op stub (`static alert() {}`), so every
// confirm and notice raised through Alert.alert is silently dropped on the web
// bundle and the destructive button's onPress never runs. Web routes to the
// browser dialogs instead; native keeps the platform Alert untouched.
//
// Signature mirrors Alert.alert so call sites swap one identifier.
import { Alert, Platform } from "react-native";

function getWebDialogHost() {
	return typeof window !== "undefined" ? window : null;
}

function resolveButtons(buttons) {
	if (!Array.isArray(buttons) || buttons.length === 0) {
		return [{ text: "OK" }];
	}
	return buttons.filter(Boolean);
}

function findCancelButton(buttons) {
	return buttons.find((button) => button?.style === "cancel") || null;
}

function findConfirmButton(buttons) {
	return (
		buttons.find((button) => button?.style === "destructive") ||
		buttons.find((button) => button?.style !== "cancel") ||
		null
	);
}

function buildDialogBody(title, message) {
	return [title, message].filter(Boolean).join("\n\n");
}

/**
 * Present an alert that survives the web bundle.
 * @param {string} title
 * @param {string} [message]
 * @param {Array<{text?: string, style?: string, onPress?: Function}>} [buttons]
 * @param {object} [options] - Forwarded to Alert.alert on native only.
 */
export function showAlert(title, message, buttons, options) {
	if (Platform.OS !== "web") {
		Alert.alert(title, message, buttons, options);
		return;
	}

	const resolvedButtons = resolveButtons(buttons);
	const dialogHost = getWebDialogHost();
	// Without a window there is no one to ask, and confirming on the user's
	// behalf would run the destructive branch unprompted.
	if (!dialogHost) return;

	const confirmButton = findConfirmButton(resolvedButtons);

	if (resolvedButtons.length === 1) {
		dialogHost.alert(buildDialogBody(title, message));
		confirmButton?.onPress?.();
		return;
	}

	const cancelButton = findCancelButton(resolvedButtons);
	if (dialogHost.confirm(buildDialogBody(title, message))) {
		confirmButton?.onPress?.();
		return;
	}
	cancelButton?.onPress?.();
}
