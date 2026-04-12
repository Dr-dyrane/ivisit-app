import {
	WEB_INSTALL_HINT_STORAGE_KEY,
	WEB_INSTALL_HINT_SUPPRESSION_MS,
} from "./webInstallHint.constants";

function getStorage() {
	if (typeof window === "undefined" || !window.localStorage) {
		return null;
	}

	return window.localStorage;
}

export function readWebInstallHintSuppression() {
	const storage = getStorage();
	if (!storage) {
		return null;
	}

	try {
		const rawValue = storage.getItem(WEB_INSTALL_HINT_STORAGE_KEY);
		if (!rawValue) {
			return null;
		}

		const parsed = JSON.parse(rawValue);
		if (!parsed || typeof parsed.until !== "number") {
			return null;
		}

		return parsed;
	} catch (_error) {
		return null;
	}
}

export function shouldSuppressWebInstallHint(now = Date.now()) {
	const suppression = readWebInstallHintSuppression();
	return Boolean(suppression?.until && suppression.until > now);
}

export function writeWebInstallHintSuppression(reason) {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	const duration =
		reason === "engaged"
			? WEB_INSTALL_HINT_SUPPRESSION_MS.engaged
			: WEB_INSTALL_HINT_SUPPRESSION_MS.dismiss;

	try {
		storage.setItem(
			WEB_INSTALL_HINT_STORAGE_KEY,
			JSON.stringify({
				reason,
				until: Date.now() + duration,
				updatedAt: Date.now(),
			}),
		);
	} catch (_error) {
		// Ignore storage failures; the hint can safely fall back to session-only behavior.
	}
}

export function clearWebInstallHintSuppression() {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	try {
		storage.removeItem(WEB_INSTALL_HINT_STORAGE_KEY);
	} catch (_error) {
		// Ignore storage failures; the hint can safely fall back to session-only behavior.
	}
}
