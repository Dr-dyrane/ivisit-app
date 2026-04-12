export const WEB_INSTALL_VARIANTS = Object.freeze({
	ios: {
		title: "Install on iPhone",
		body: "Add iVisit to Home Screen for the cleaner launch.",
		actionLabel: "Show steps",
		actionIcon: "chevron-forward",
		leadingIcon: "share-outline",
	},
	android: {
		title: "Install on Android",
		body: "Add iVisit for faster launch and the cleaner app feel.",
		actionLabel: "Install app",
		actionPendingLabel: "Opening...",
		actionIcon: "download-outline",
		leadingIcon: "download-outline",
	},
});

export const WEB_INSTALL_HINT_STORAGE_KEY = "ivisit.web.installHint";

export const WEB_INSTALL_HINT_SUPPRESSION_MS = Object.freeze({
	dismiss: 3 * 24 * 60 * 60 * 1000,
	engaged: 7 * 24 * 60 * 60 * 1000,
});

export default WEB_INSTALL_VARIANTS;
