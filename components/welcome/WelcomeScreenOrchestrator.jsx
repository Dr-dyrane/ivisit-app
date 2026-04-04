import React from "react";
import { Platform } from "react-native";
import useAuthViewport from "../../hooks/ui/useAuthViewport";
import WelcomeIOSMobileView from "./views/WelcomeIOSMobileView";
import WelcomeAndroidMobileView from "./views/WelcomeAndroidMobileView";
import WelcomeAndroidFoldView from "./views/WelcomeAndroidFoldView";
import WelcomeAndroidTabletView from "./views/WelcomeAndroidTabletView";
import WelcomeAndroidChromebookView from "./views/WelcomeAndroidChromebookView";
import WelcomeIOSPadView from "./views/WelcomeIOSPadView";
import WelcomeMacbookView from "./views/WelcomeMacbookView";
import WelcomeWebMobileView from "./views/WelcomeWebMobileView";

export function getWelcomeVariant({ platform, isWeb, width }) {
	if (platform === "android") {
		if (width >= 1280) return "android-chromebook";
		if (width >= 840) return "android-tablet";
		if (width >= 600) return "android-fold";
		return "android-mobile";
	}

	if (width >= 1180) {
		return "macbook";
	}

	if (width >= 768) {
		if (platform === "ios") return "ios-pad";
		if (isWeb) return "web-pad";
	}

	if (width < 768) {
		if (platform === "ios") return "ios-mobile";
		if (platform === "android") return "android-mobile";
		if (isWeb) return "web-mobile";
	}

	return "mobile-baseline";
}

export default function WelcomeScreenOrchestrator(props) {
	const { width, isWeb } = useAuthViewport();
	const variant = getWelcomeVariant({
		platform: Platform.OS,
		isWeb,
		width,
	});

	switch (variant) {
		case "android-chromebook":
			return <WelcomeAndroidChromebookView {...props} />;
		case "android-tablet":
			return <WelcomeAndroidTabletView {...props} />;
		case "android-fold":
			return <WelcomeAndroidFoldView {...props} />;
		case "macbook":
			return <WelcomeMacbookView {...props} />;
		case "ios-pad":
		case "web-pad":
			return <WelcomeIOSPadView {...props} />;
		case "ios-mobile":
			return <WelcomeIOSMobileView {...props} />;
		case "android-mobile":
			return <WelcomeAndroidMobileView {...props} />;
		case "web-mobile":
			return <WelcomeWebMobileView {...props} />;
		case "mobile-baseline":
		default:
			return <WelcomeIOSMobileView {...props} />;
	}
}
