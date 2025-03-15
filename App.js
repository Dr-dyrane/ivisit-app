import { ExpoRoot } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Alert } from "react-native";

// The entry point for the app
export default function App() {
	useEffect(() => {
		const checkForUpdates = async () => {
			try {
				const update = await Updates.checkForUpdateAsync();
				if (update.isAvailable) {
					await Updates.fetchUpdateAsync();
					Alert.alert(
						"Update Available",
						"A new version of the app is available. Restarting the app to apply the update.",
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
