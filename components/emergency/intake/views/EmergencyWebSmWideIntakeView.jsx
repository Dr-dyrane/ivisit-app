import React, { useEffect } from "react";
import { Platform } from "react-native";
import EmergencyIOSMobileIntakeView from "./EmergencyIOSMobileIntakeView";
import { useTheme } from "../../../../contexts/ThemeContext";
import useWelcomeWebSurfaceChrome from "../../../welcome/hooks/useWelcomeWebSurfaceChrome";

const EMERGENCY_WEB_SM_WIDE_SCROLLBAR_STYLE_ID =
	"emergency-web-sm-wide-scrollbar-style";

export default function EmergencyWebSmWideIntakeView(props) {
	const { isDarkMode } = useTheme();
	useWelcomeWebSurfaceChrome(isDarkMode);

	useEffect(() => {
		if (Platform.OS !== "web" || typeof document === "undefined") {
			return undefined;
		}

		let styleElement = document.getElementById(
			EMERGENCY_WEB_SM_WIDE_SCROLLBAR_STYLE_ID,
		);
		let created = false;

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = EMERGENCY_WEB_SM_WIDE_SCROLLBAR_STYLE_ID;
			styleElement.textContent = `
				#emergency-web-sm-wide-scroll,
				#emergency-web-sm-wide-scroll > div,
				#emergency-location-search-results-scroll,
				#emergency-location-search-results-scroll > div {
					scrollbar-width: none;
					-ms-overflow-style: none;
				}

				#emergency-web-sm-wide-scroll::-webkit-scrollbar,
				#emergency-web-sm-wide-scroll > div::-webkit-scrollbar,
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
	}, []);

	return (
		<EmergencyIOSMobileIntakeView
			{...props}
			locationSheetBehavior="ios"
			locationSheetPresentation="dialog"
		/>
	);
}
