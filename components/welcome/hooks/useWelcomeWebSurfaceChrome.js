import { useEffect } from "react";
import { Platform } from "react-native";
import { getWelcomeRootBackground } from "../../../constants/welcomeTheme";

export function useWelcomeWebSurfaceChrome(isDarkMode, enabled = true) {
	useEffect(() => {
		if (
			!enabled ||
			Platform.OS !== "web" ||
			typeof document === "undefined"
		) {
			return undefined;
		}

		const previousHtmlBackground =
			document.documentElement.style.backgroundColor;
		const previousBodyBackground = document.body.style.backgroundColor;
		const rootElement = document.getElementById("root");
		const previousRootBackground = rootElement?.style.backgroundColor;

		const rootBackground = getWelcomeRootBackground(isDarkMode);
		document.documentElement.style.backgroundColor = rootBackground;
		document.body.style.backgroundColor = rootBackground;
		document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
		if (rootElement) {
			rootElement.style.backgroundColor = rootBackground;
		}

		return () => {
			document.documentElement.style.backgroundColor = previousHtmlBackground;
			document.body.style.backgroundColor = previousBodyBackground;
			document.documentElement.style.colorScheme = "";
			if (rootElement) {
				rootElement.style.backgroundColor = previousRootBackground || "";
			}
		};
	}, [enabled, isDarkMode]);
}

export default useWelcomeWebSurfaceChrome;
