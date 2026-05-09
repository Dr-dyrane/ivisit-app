/**
 * Saved Locations Bootstrap Hook
 *
 * Architecture:
 * - L3 (Zustand): locationStore.savedLocations
 * - L2 (TanStack Query): preferences.view_preferences JSONB
 * - Runtime: Initializes sync layer on app start
 *
 * No DB schema changes - uses existing preferences.view_preferences
 */

import { useEffect } from "react";
import { initializeSavedLocationsSync } from "../../services/savedLocationsSyncService";
import { useAuth } from "../../contexts/AuthContext";

let initialized = false;

export function useSavedLocationsBootstrap() {
	const { user, isAuthenticated } = useAuth();

	useEffect(() => {
		// Only initialize once when authenticated
		if (!isAuthenticated || !user || initialized) return;

		initialized = true;
		
		// Initialize sync layer (hydrate + subscribe)
		initializeSavedLocationsSync().catch((error) => {
			console.warn("[useSavedLocationsBootstrap] Init failed:", error.message);
		});

	}, [isAuthenticated, user]);
}

export default useSavedLocationsBootstrap;
