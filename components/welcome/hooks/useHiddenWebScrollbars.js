import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * useHiddenWebScrollbars
 *
 * Injects a <style> tag to hide the native scrollbar on a web ScrollView
 * identified by nativeID. Cleans up on unmount.
 *
 * No-op on native platforms or when disabled.
 */
export function useHiddenWebScrollbars({ enabled, styleId, nativeID }) {
	useEffect(() => {
		if (
			!enabled ||
			Platform.OS !== "web" ||
			typeof document === "undefined" ||
			!styleId ||
			!nativeID
		) {
			return undefined;
		}

		let styleElement = document.getElementById(styleId);
		let created = false;

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = styleId;
			styleElement.textContent = `
				#${nativeID},
				#${nativeID} > div {
					scrollbar-width: none;
					-ms-overflow-style: none;
				}

				#${nativeID}::-webkit-scrollbar,
				#${nativeID} > div::-webkit-scrollbar {
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
	}, [enabled, nativeID, styleId]);
}
