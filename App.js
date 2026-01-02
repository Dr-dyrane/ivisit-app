// App.js

"use client";

import { ExpoRoot } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import * as Updates from "expo-updates";

/**
 * Entry point for the app
 */
export default function App() {

	useEffect(() => {
		const checkForUpdates = async () => {
			try {
				const update = await Updates.checkForUpdateAsync();
				if (update.isAvailable) {
					await Updates.fetchUpdateAsync();
					Alert.alert(
						"Update Available",
						"A new version is available. Restarting to apply it.",
						[{ text: "OK", onPress: () => Updates.reloadAsync() }]
					);
				}
			} catch (e) {
				console.error(e);
			}
		};
		checkForUpdates();
	}, []);

	return <ExpoRoot />;
}
