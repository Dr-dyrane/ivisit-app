/**
 * Saved Locations Sync Service
 *
 * Architecture:
 * - L3 (Zustand): locationStore.savedLocations (source of truth)
 * - L2 (TanStack Query): preferences.view_preferences JSONB (persistence)
 * - Auto-sync: Store subscription → Supabase update
 * - Hydration: App init → Load from Supabase → Populate store
 *
 * No DB schema changes - uses existing preferences.view_preferences
 */

import { supabase } from "./supabase";
import { isValidUUID } from "./displayIdService";
import { useLocationStore } from "../stores/locationStore";
import mapboxService from "./mapboxService";
import { getSavedAddressKey } from "./locationAddressService";

const VIEW_PREFS_KEY = "savedLocations";

// Debounce delay for sync (prevent excessive API calls)
const SYNC_DEBOUNCE_MS = 2000;

let syncTimeout = null;
let isHydrating = false;

/**
 * Map saved locations to view_preferences format
 */
const mapToViewPreferences = (savedLocations) => ({
	[VIEW_PREFS_KEY]: savedLocations,
});

/**
 * Extract saved locations from view_preferences
 */
const mapFromViewPreferences = (viewPreferences) => {
	if (!viewPreferences || typeof viewPreferences !== "object") return [];
	const locations = viewPreferences[VIEW_PREFS_KEY];
	return Array.isArray(locations) ? locations : [];
};

/**
 * Sync saved locations to preferences.view_preferences
 */
async function syncToServer(savedLocations) {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || !isValidUUID(user.id)) return;

	const viewPrefs = mapToViewPreferences(savedLocations);

	const { error } = await supabase
		.from("preferences")
		.update({
			view_preferences: viewPrefs,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id);

	if (error) {
		console.warn("[SavedLocationsSync] Failed to sync:", error.message);
	}
}

/**
 * Load saved locations from preferences.view_preferences
 */
async function loadFromServer() {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || !isValidUUID(user.id)) return [];

	const { data, error } = await supabase
		.from("preferences")
		.select("view_preferences")
		.eq("user_id", user.id)
		.single();

	if (error) {
		console.warn("[SavedLocationsSync] Failed to load:", error.message);
		return [];
	}

	return mapFromViewPreferences(data?.view_preferences);
}

async function loadProfileAddress(userId) {
	if (!userId || !isValidUUID(userId)) return null;

	const { data, error } = await supabase
		.from("profiles")
		.select("address")
		.eq("id", userId)
		.single();

	if (error) {
		console.warn("[SavedLocationsSync] Failed to load profile address:", error.message);
		return null;
	}

	return typeof data?.address === "string" && data.address.trim()
		? data.address.trim()
		: null;
}

async function seedHomeFromProfileAddress(userId) {
	const store = useLocationStore.getState();
	const hasHome = (store.savedLocations || []).some(
		(location) => getSavedAddressKey(location) === "home",
	);
	if (hasHome) return false;

	const profileAddress = await loadProfileAddress(userId);
	if (!profileAddress) return false;

	try {
		// Rollback note: profile.address is only a legacy Home seed. Do not let
		// this path overwrite an existing Home or create a coordinate-less saved
		// address; both caused state-flow ambiguity in earlier sheet work.
		const geocoded = await mapboxService.geocodeAddress(profileAddress);
		const latitude = Number(geocoded?.latitude);
		const longitude = Number(geocoded?.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return false;
		}

		const result = store.addSavedLocation(
			{
				category: "home",
				label: "Home",
				address: geocoded?.formatted_address || profileAddress,
				latitude,
				longitude,
				countryCode: geocoded?.countryCode || null,
				provider: geocoded?.source || "mapbox",
				sync: { status: "pendingCreate" },
			},
			{ ownerUserId: userId },
		);

		return result?.status === "created" || result?.status === "updated";
	} catch (error) {
		console.warn(
			"[SavedLocationsSync] Could not seed Home from profile address:",
			error.message,
		);
		return false;
	}
}

/**
 * Initialize sync layer
 * - Hydrates savedLocations from server
 * - Sets up store subscription for auto-sync
 */
export async function initializeSavedLocationsSync() {
	// Prevent double initialization
	if (isHydrating) return;
	isHydrating = true;

	try {
		const { data: { user } } = await supabase.auth.getUser();
		const ownerUserId = user?.id && isValidUUID(user.id) ? user.id : "guest";

		// Load from server and populate store
		const serverLocations = await loadFromServer();
		
		if (serverLocations.length > 0) {
			const store = useLocationStore.getState();
			store.setSavedLocations(serverLocations, { ownerUserId });
		}

		const seededHome = await seedHomeFromProfileAddress(ownerUserId);

		// Subscribe to store changes for auto-sync
		useLocationStore.subscribe((state, prevState) => {
			// Only sync if savedLocations actually changed
			if (state.savedLocations !== prevState.savedLocations) {
				// Debounce to prevent excessive API calls
				if (syncTimeout) clearTimeout(syncTimeout);
				syncTimeout = setTimeout(() => {
					syncToServer(state.savedLocations);
				}, SYNC_DEBOUNCE_MS);
			}
		});

		if (seededHome) {
			await syncToServer(useLocationStore.getState().savedLocations);
		}

	} finally {
		isHydrating = false;
	}
}

/**
 * Manually trigger sync (for explicit save actions)
 */
export async function forceSyncSavedLocations() {
	const store = useLocationStore.getState();
	await syncToServer(store.savedLocations);
}

/**
 * Get current server-side saved locations (for conflict resolution)
 */
export async function getServerSavedLocations() {
	return loadFromServer();
}
