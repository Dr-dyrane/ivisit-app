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
import {
	initializeSavedLocationsSync,
	resetSavedLocationsSyncRuntime,
} from "../../services/savedLocationsSyncService";
import { useAuth } from "../../contexts/AuthContext";
import { useLocationStore } from "../../stores/locationStore";

let initializedUserId = null;

export function useSavedLocationsBootstrap() {
	const { user } = useAuth();
	const isAuthenticated = user?.isAuthenticated === true;
	const activeUserId = isAuthenticated && user?.id ? user.id : null;

	useEffect(() => {
		if (!activeUserId) {
			if (initializedUserId !== null) {
				resetSavedLocationsSyncRuntime();
				useLocationStore.getState().setSavedLocations([], { ownerUserId: "guest" });
			}
			initializedUserId = null;
			return;
		}

		// PULLBACK NOTE: saved address sync is keyed by auth identity, not by
		// process lifetime. The old module boolean skipped hydration after an
		// account switch and could leave the previous user's places in memory.
		if (initializedUserId === activeUserId) return;

		resetSavedLocationsSyncRuntime();
		initializedUserId = activeUserId;
		
		// Initialize sync layer (hydrate + subscribe)
		initializeSavedLocationsSync().catch((error) => {
			console.warn("[useSavedLocationsBootstrap] Init failed:", error.message);
			if (initializedUserId === activeUserId) {
				initializedUserId = null;
			}
		});

	}, [activeUserId]);
}

export default useSavedLocationsBootstrap;
