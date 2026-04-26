// app/runtime/RootRuntimeGate.jsx
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { appMigrationsService } from "../services/appMigrationsService";
// PULLBACK NOTE: Phase 6a — hydrate modeStore on startup before app renders
// OLD: mode was hydrated inside EmergencyContext on mount (deferred, race-prone)
// NEW: hydrateModeStore() runs in prepare() — deterministic, before first render
import { hydrateModeStore } from "../stores/modeStore";

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

				// Phase 6a — hydrate Zustand stores before first render
				await hydrateModeStore();

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
