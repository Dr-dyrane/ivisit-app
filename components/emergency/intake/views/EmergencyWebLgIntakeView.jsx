import React, { useEffect } from "react";
import { Platform } from "react-native";
import EmergencyIOSMobileIntakeView from "./EmergencyIOSMobileIntakeView";
import { useTheme } from "../../../../contexts/ThemeContext";
import useWelcomeWebSurfaceChrome from "../../../welcome/hooks/useWelcomeWebSurfaceChrome";

export default function EmergencyWebLgIntakeView({
	scrollElementId = "emergency-web-lg-scroll",
	scrollbarStyleId = "emergency-web-lg-scrollbar-style",
	...props
}) {
	const { isDarkMode } = useTheme();
	useWelcomeWebSurfaceChrome(isDarkMode);

	useEffect(() => {
		if (Platform.OS !== "web" || typeof document === "undefined") {
			return undefined;
		}

		let styleElement = document.getElementById(scrollbarStyleId);
		let created = false;

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = scrollbarStyleId;
			styleElement.textContent = `
				#${scrollElementId},
				#${scrollElementId} > div,
				#emergency-location-search-results-scroll,
				#emergency-location-search-results-scroll > div {
					scrollbar-width: none;
					-ms-overflow-style: none;
				}

				#${scrollElementId}::-webkit-scrollbar,
				#${scrollElementId} > div::-webkit-scrollbar,
				#emergency-location-search-results-scroll::-webkit-scrollbar,
				#emergency-location-search-results-scroll > div::-webkit-scrollbar {
					width: 0;
					height: 0;
					display: none;
				}
			`;
			document.head.appendChild(styleElement);
			created = true;
		}

		return () => {
			if (created && styleElement?.parentNode) {
				styleElement.parentNode.removeChild(styleElement);
			}
		};
	}, [scrollElementId, scrollbarStyleId]);

	return (
		<EmergencyIOSMobileIntakeView
			{...props}
			locationSheetBehavior="ios"
			locationSheetPresentation="dialog"
		/>
	);
}
