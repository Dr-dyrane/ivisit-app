import { useEffect, useState } from "react";
import { Dimensions, View, Image } from "react-native";
import * as SplashScreen from "expo-splash-screen";


// Hide Expo splash immediately on app launch
SplashScreen.hideAsync().catch(() => {});

export function useCustomSplashScreen() {
	const [appIsReady, setAppIsReady] = useState(false);
	const screenWidth = Dimensions.get("window").width;
	const screenHeight = Dimensions.get("window").height;

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
					backgroundColor:  'white',
					justifyContent: "center",
					alignItems: "center",
					zIndex: 999, // Ensure it's on top
				}}
			>
				<Image
					source={require("../assets/splash.png")}
					style={{ width: screenWidth, height: screenHeight }}
					resizeMode="contain"
				/>
			</View>
		);
	}

	return { appIsReady, SplashScreenView };
}
