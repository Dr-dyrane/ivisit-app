import React from "react";
import { Platform } from "react-native";
import useAuthViewport from "../../hooks/ui/useAuthViewport";
import {
	BREAKPOINTS,
	DEVICE_BREAKPOINTS,
	WELCOME_WEB_BREAKPOINTS,
} from "../../constants/breakpoints";
import WelcomeIOSMobileView from "./views/WelcomeIOSMobileView";
import WelcomeAndroidMobileView from "./views/WelcomeAndroidMobileView";
import WelcomeAndroidFoldView from "./views/WelcomeAndroidFoldView";
import WelcomeAndroidTabletView from "./views/WelcomeAndroidTabletView";
import WelcomeAndroidChromebookView from "./views/WelcomeAndroidChromebookView";
import WelcomeIOSPadView from "./views/WelcomeIOSPadView";
import WelcomeMacbookView from "./views/WelcomeMacbookView";
import WelcomeWebMobileView from "./views/WelcomeWebMobileView";
import WelcomeWebSmWideView from "./views/WelcomeWebSmWideView";
import WelcomeWebMdView from "./views/WelcomeWebMdView";
import WelcomeWebLgView from "./views/WelcomeWebLgView";
import WelcomeWebXlView from "./views/WelcomeWebXlView";
import WelcomeWeb2Xl3XlView from "./views/WelcomeWeb2Xl3XlView";
import WelcomeWebUltraWideView from "./views/WelcomeWebUltraWideView";

export function getWelcomeVariant({ platform, isWeb, width }) {
	if (platform === "android") {
		if (width >= BREAKPOINTS.xl) return "android-chromebook";
		if (width >= DEVICE_BREAKPOINTS.androidTablet) return "android-tablet";
		if (width >= DEVICE_BREAKPOINTS.androidFold) return "android-fold";
		return "android-mobile";
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.ultraWideMin) {
		return "web-ultra-wide";
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.twoXlMin) {
		return "web-2xl-3xl";
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.xlMin) {
		return "web-xl";
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.lgMin) {
		return "web-lg";
	}

	if (width >= DEVICE_BREAKPOINTS.nativeDesktop) {
		return "macbook";
	}

	if (width >= BREAKPOINTS.md) {
		if (platform === "ios") return "ios-pad";
		if (isWeb) return "web-md";
	}

	if (isWeb && width >= WELCOME_WEB_BREAKPOINTS.smWideMin) {
		return "web-sm-wide";
	}

	if (width < BREAKPOINTS.md) {
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
		case "web-lg":
			return <WelcomeWebLgView {...props} />;
		case "web-xl":
			return <WelcomeWebXlView {...props} />;
		case "web-2xl-3xl":
			return <WelcomeWeb2Xl3XlView {...props} />;
		case "web-ultra-wide":
			return <WelcomeWebUltraWideView {...props} />;
		case "web-md":
			return <WelcomeWebMdView {...props} />;
		case "web-sm-wide":
			return <WelcomeWebSmWideView {...props} />;
		case "ios-pad":
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
