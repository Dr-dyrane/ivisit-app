// app/runtime/RootRuntimeGate.jsx
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { appMigrationsService } from "../../services/appMigrationsService";

// Global guard to ensure splash prevention only runs once across re-mounts
let isSplashPrevented = false;

/**
 * RootRuntimeGate
 *
 * Handles startup readiness before the app renders:
 * - Splash screen management
 * - Database migrations
 * - Schema reload
 * - Emergency trip store hydration (Metro reload safety)
 */
// Required by Expo Router (all files in app/ must have a default export)
export default null;

export function RootRuntimeGate({ children }) {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		let isMounted = true;

		async function prepare() {
			try {
				if (!isSplashPrevented) {
					await SplashScreen.preventAutoHideAsync().catch((e) => {
						console.warn("[RootRuntimeGate] SplashScreen error:", e.message);
					});
					isSplashPrevented = true;
				}

				// Run migrations and schema reload on startup
				await appMigrationsService.run();

				if (isMounted) setIsReady(true);
			} catch (err) {
				console.warn("[RootRuntimeGate] Prepare exception:", err);
				if (isMounted) setIsReady(true);
			}
		}

		prepare();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (isReady) {
			const timer = setTimeout(() => {
				SplashScreen.hideAsync().catch((err) => {
					console.warn("[RootRuntimeGate] hideAsync error:", err.message);
				});
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [isReady]);

	// Render children only when ready
	return <View style={{ flex: 1 }}>{isReady ? children : null}</View>;
}
