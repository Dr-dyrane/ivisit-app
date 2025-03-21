import { useEffect, useState, useRef } from "react";
import { Animated, Dimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";

// Disable the default Expo splash screen
SplashScreen.preventAutoHideAsync().catch(() => {});

export function useCustomSplashScreen() {
	const [appIsReady, setAppIsReady] = useState(false);
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const screenWidth = Dimensions.get("window").width;
	const screenHeight = Dimensions.get("window").height;

	useEffect(() => {
		async function loadApp() {
			try {
				// Simulate loading resources
				await new Promise((resolve) => setTimeout(resolve, 2500));
			} catch (e) {
				console.warn(e);
			} finally {
				// Start fade-out animation
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 500,
					useNativeDriver: true,
				}).start(() => {
					setAppIsReady(true);
					SplashScreen.hideAsync().catch(() => {});
				});
			}
		}

		loadApp();
	}, []);

	return { appIsReady, fadeAnim, screenWidth, screenHeight };
}
