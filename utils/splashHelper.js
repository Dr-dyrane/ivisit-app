import { useEffect, useState } from "react";
import { Dimensions, View, Image, useColorScheme } from "react-native";

export function useCustomSplashScreen() {
	const [appIsReady, setAppIsReady] = useState(false);
	const screenWidth = Dimensions.get("window").width;
	const screenHeight = Dimensions.get("window").height;
	const deviceTheme = useColorScheme();
	const isDarkMode = deviceTheme === "dark";

	useEffect(() => {
		// Show custom splash for 2.5 seconds, then transition to app
		const timer = setTimeout(() => {
			setAppIsReady(true);
		}, 1500);

		return () => clearTimeout(timer);
	}, []);

	// Custom splash screen component
	function SplashScreenView() {
		if (appIsReady) return null; // Hide splash when app is ready

		return (
			<View
				style={{
					position: "absolute",
					width: screenWidth,
					height: screenHeight,
					backgroundColor: isDarkMode ? "#181818" : "white",
					justifyContent: "center",
					alignItems: "center",
					zIndex: 999, // Ensure it's on top
				}}
			>
				<Image
					source={require("../assets/custom_splash.png")}
					style={{ width: screenWidth, height: screenHeight }}
					resizeMode="contain"
				/>
			</View>
		);
	}

	return { appIsReady, SplashScreenView };
}
