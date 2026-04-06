import React from "react";
import { Platform } from "react-native";
import {
	BREAKPOINTS,
	DEVICE_BREAKPOINTS,
	WELCOME_WEB_BREAKPOINTS,
} from "../../../constants/breakpoints";
import useAuthViewport from "../../../hooks/ui/useAuthViewport";
import EmergencyIOSMobileIntakeView from "./views/EmergencyIOSMobileIntakeView";
import EmergencyAndroidMobileIntakeView from "./views/EmergencyAndroidMobileIntakeView";
import EmergencyAndroidFoldIntakeView from "./views/EmergencyAndroidFoldIntakeView";
import EmergencyAndroidTabletIntakeView from "./views/EmergencyAndroidTabletIntakeView";
import EmergencyAndroidChromebookIntakeView from "./views/EmergencyAndroidChromebookIntakeView";
import EmergencyWebMobileIntakeView from "./views/EmergencyWebMobileIntakeView";
import EmergencyWebSmWideIntakeView from "./views/EmergencyWebSmWideIntakeView";
import EmergencyWebMdIntakeView from "./views/EmergencyWebMdIntakeView";
import EmergencyWebLgIntakeView from "./views/EmergencyWebLgIntakeView";
import EmergencyWebXlIntakeView from "./views/EmergencyWebXlIntakeView";
import EmergencyWeb2xl3xlIntakeView from "./views/EmergencyWeb2xl3xlIntakeView";
import EmergencyWebUltraWideIntakeView from "./views/EmergencyWebUltraWideIntakeView";

export function getEmergencyIntakeVariant({ platform, isWeb, width }) {
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

function getViewportModeForVariant(variant) {
	switch (variant) {
		case "ios-pad":
			return "ios-pad";
		case "android-fold":
		case "android-tablet":
		case "web-sm-wide":
		case "web-md":
			return "tablet";
		case "android-chromebook":
		case "macbook":
		case "web-lg":
		case "web-xl":
		case "web-2xl-3xl":
		case "web-ultra-wide":
			return "desktop";
		case "ios-mobile":
		case "android-mobile":
		case "web-mobile":
		case "mobile-baseline":
		default:
			return "phone";
	}
}

export default function EmergencyIntakeOrchestrator(props) {
	const { width, isWeb } = useAuthViewport();
	const variant = getEmergencyIntakeVariant({
		platform: Platform.OS,
		isWeb,
		width,
	});
	const viewportMode = getViewportModeForVariant(variant);

	if (variant === "android-mobile") {
		return (
			<EmergencyAndroidMobileIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "android-fold") {
		return (
			<EmergencyAndroidFoldIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "android-tablet") {
		return (
			<EmergencyAndroidTabletIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "android-chromebook") {
		return (
			<EmergencyAndroidChromebookIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-mobile") {
		return (
			<EmergencyWebMobileIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-sm-wide") {
		return (
			<EmergencyWebSmWideIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-md") {
		return (
			<EmergencyWebMdIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-lg") {
		return (
			<EmergencyWebLgIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-xl") {
		return (
			<EmergencyWebXlIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-2xl-3xl") {
		return (
			<EmergencyWeb2xl3xlIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	if (variant === "web-ultra-wide") {
		return (
			<EmergencyWebUltraWideIntakeView
				{...props}
				viewportMode={viewportMode}
				screenVariant={variant}
			/>
		);
	}

	return (
		<EmergencyIOSMobileIntakeView
			{...props}
			viewportMode={viewportMode}
			screenVariant={variant}
			locationSheetBehavior="ios"
			locationSheetPresentation={variant === "ios-pad" ? "dialog" : "sheet"}
		/>
	);
}
