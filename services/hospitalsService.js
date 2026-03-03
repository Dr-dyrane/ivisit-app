import { supabase } from "./supabase";
import { isValidUUID, resolveEntityId } from "./displayIdService";

let hasWarnedMissingHospitalRoomsTable = false;

const DEFAULT_HOSPITAL_IMAGES = [
	"https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80",
	"https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
];

const toFinite = (value, fallback = 0) => (Number.isFinite(value) ? Number(value) : fallback);
const toNonNegativeInt = (value, fallback = 0) => {
	const n = Number(value);
	return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
};
const toText = (value, fallback = "") => (typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback);
const toTextArray = (value) =>
	Array.isArray(value)
		? value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean)
		: [];
const toObject = (value, fallback = {}) => (value && typeof value === "object" && !Array.isArray(value) ? value : fallback);
const hashString = (seed) => {
	const input = String(seed || "hospital");
	let hash = 0;
	for (let i = 0; i < input.length; i += 1) {
		hash = (hash << 5) - hash + input.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
};
const pickDefaultHospitalImage = (seed) => DEFAULT_HOSPITAL_IMAGES[hashString(seed) % DEFAULT_HOSPITAL_IMAGES.length];

/**
 * Service to handle hospital data operations
 */
export const hospitalsService = {
	/**
	 * Hydrate sparse discovery/nearby rows with full hospital table columns so UI gating
	 * (beds/ambulances/organization) matches the real DB state.
	 */
	async _hydrateHospitalRows(rows = []) {
		const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
		if (list.length === 0) return [];

		const ids = [
			...new Set(
				list
					.map((r) => r?.id)
					.filter((id) => typeof id === "string" && isValidUUID(id))
			),
		];
		if (ids.length === 0) return list;

		const { data, error } = await supabase
			.from("hospitals")
			.select("*")
			.in("id", ids);

		if (error) {
			console.warn("hospitalsService._hydrateHospitalRows warning:", error);
			return list;
		}

		const byId = new Map((data || []).map(h => [h.id, h]));
		return list.map((row) => {
			const full = row?.id ? byId.get(row.id) : null;
			// Preserve computed discovery fields (distance/ETA/status from edge/RPC) while
			// restoring actual availability/org fields from DB.
			return full ? { ...full, ...row } : row;
		});
	},

	/**
	 * Internal helper to map database schema to application domain model
	 * @private
	 */
	_mapHospital(h) {
		if (!h) return null;

		const distanceKm =
			Number.isFinite(h?.distance_km)
				? Number(h.distance_km)
				: (Number.isFinite(h?.distance) ? Number(h.distance) : 0);
		const availableBeds =
			Number.isFinite(h?.available_beds)
				? toNonNegativeInt(h.available_beds, 0)
				: toNonNegativeInt(h?.availableBeds, 0);
		const ambulancesCount =
			Number.isFinite(h?.ambulances_count)
				? toNonNegativeInt(h.ambulances_count, 0)
				: toNonNegativeInt(h?.ambulances, 0);

		const latFromGeo = Array.isArray(h?.coordinates?.coordinates) ? Number(h.coordinates.coordinates[1]) : NaN;
		const lngFromGeo = Array.isArray(h?.coordinates?.coordinates) ? Number(h.coordinates.coordinates[0]) : NaN;
		const latitude = Number.isFinite(h?.latitude) ? Number(h.latitude) : (Number.isFinite(latFromGeo) ? latFromGeo : 0);
		const longitude = Number.isFinite(h?.longitude) ? Number(h.longitude) : (Number.isFinite(lngFromGeo) ? lngFromGeo : 0);
		const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0);

		const isVerified = h?.verified === true;
		const hasExternalPlaceRef = typeof h?.place_id === "string" && h.place_id.trim().length > 0;
		const importedFromGoogle = h?.imported_from_google === true || h?.google_only === true;
		const importedFromMapbox = h?.mapbox_only === true || (!importedFromGoogle && hasExternalPlaceRef && !isVerified);
		const importStatus = toText(
			h?.import_status,
			hasExternalPlaceRef && !isVerified ? "pending" : "verified"
		);

		const image = toText(
			h?.image,
			toTextArray(h?.google_photos)[0] || pickDefaultHospitalImage(h?.place_id || h?.id || h?.name)
		);
		const dynamicWait = this.calculateDynamicWaitTime(
			{
				distanceKm,
				rating: toFinite(h?.google_rating, toFinite(h?.rating, 0)),
				verified: isVerified,
				availableBeds,
				emergencyLevel: toText(h?.emergency_level, "Standard"),
				placeId: toText(h?.place_id),
			},
			null
		);
		const waitTime = Number.isFinite(h?.emergency_wait_time_minutes)
			? `${toNonNegativeInt(h.emergency_wait_time_minutes, 0)} min`
			: toText(h?.wait_time, dynamicWait.displayText);
		const eta = toText(
			h?.eta,
			distanceKm > 0 ? `${Math.max(2, Math.ceil(distanceKm * 3))} mins` : "8-12 mins"
		);
		const status = toText(h?.status, "available");
		const phone = toText(h?.google_phone, toText(h?.phone, ""));
		const rating = toFinite(h?.google_rating, toFinite(h?.rating, 0));
		const emergencyLevel = toText(h?.emergency_level, "Standard");
		const imageConfidence = Number.isFinite(h?.image_confidence) ? Number(h.image_confidence) : (image === h?.image ? 0.95 : 0.35);
		const imageSource = toText(h?.image_source, image === h?.image ? "provider_image" : "deterministic_fallback");

		return {
			id: toText(h?.id),
			name: toText(h?.name, "Unnamed Hospital"),
			address: toText(h?.google_address, toText(h?.address, "Address unavailable")),
			phone,
			rating,
			type: toText(h?.type, "General"),
			image,
			imageSource,
			imageConfidence,
			specialties: toTextArray(h?.specialties),
			serviceTypes: toTextArray(h?.service_types),
			features: toTextArray(h?.features),
			emergencyLevel,
			availableBeds,
			ambulances: ambulancesCount,
			waitTime,
			eta,
			price: toText(h?.price_range, ambulancesCount > 0 ? "Emergency" : "$$$"),
			distance: (distanceKm && Number.isFinite(distanceKm) && distanceKm > 0)
				? `${Math.round(distanceKm * 10) / 10} km`
				: "--",
			distanceKm,
			coordinates: {
				latitude,
				longitude,
			},
			hasValidCoordinates,
			verified: isVerified,
			status,
			lastAvailabilityUpdate: toText(h?.last_availability_update),
			bedAvailability: toObject(h?.bed_availability, {}),
			ambulanceAvailability: toObject(h?.ambulance_availability, {}),
			emergencyWaitTimeMinutes: toNonNegativeInt(h?.emergency_wait_time_minutes, 0),
			realTimeSync: h?.real_time_sync === true,
			// Google/External Fields
			placeId: toText(h?.place_id),
			googleWebsite: toText(h?.google_website),
			googlePhotos: toTextArray(h?.google_photos),
			googleTypes: toTextArray(h?.google_types),
			importStatus,
			importedFromGoogle,
			importedFromMapbox,
			orgAdminId: toText(h?.org_admin_id),
			organizationId: toText(h?.organization_id, toText(h?.organizationId)),
			organization_id: toText(h?.organization_id, toText(h?.organizationId)),
			// Computed UI helpers
			isCovered: isVerified && status === "available",
			isGoogleOnly: h.google_only === true,
			isMapboxOnly: importedFromMapbox,
		};
	},

	/**
	 * Fetch all hospitals from Supabase
	 * @returns {Promise<Array>} List of hospitals in app format
	 */
	async list() {
		try {
			const { data, error } = await supabase
				.from("hospitals")
				.select("*")
				.order("name");

			if (error) throw error;
			return (data || []).map(h => this._mapHospital(h));
		} catch (err) {
			console.error("hospitalsService.list error:", err);
			throw err;
		}
	},

	/**
	 * Fetch nearby hospitals with distance calculations
	 * @param {number} userLat - User latitude
	 * @param {number} userLng - User longitude  
	 * @param {number} radiusKm - Search radius in kilometers
	 * @returns {Promise<Array>} List of nearby hospitals with distance info
	 */
	async listNearby(userLat, userLng, radiusKm = 50) {
		try {
			const { data, error } = await supabase
				.rpc('nearby_hospitals', {
					user_lat: userLat,
					user_lng: userLng,
					radius_km: radiusKm
				});

			if (error) throw error;
			const hydrated = await this._hydrateHospitalRows(data || []);
			return hydrated.map(h => this._mapHospital(h));
		} catch (err) {
			console.error("hospitalsService.listNearby error:", err);
			throw err;
		}
	},

	/**
	 * Discover nearby hospitals using unified Edge Function
	 * @param {number} lat - Latitude
	 * @param {number} lng - Longitude
	 * @param {number} radius - Radius in meters (default 50000)
	 * @param {{ includeMapboxPlaces?: boolean, includeGooglePlaces?: boolean }} options
	 */
	async discoverNearby(lat, lng, radius = 50000, options = {}) {
		try {
			const includeMapboxPlaces = options?.includeMapboxPlaces !== false;
			const includeGooglePlaces = options?.includeGooglePlaces === true;

			const { data, error } = await supabase.functions.invoke('discover-hospitals', {
				body: {
					latitude: lat,
					longitude: lng,
					radius,
					mode: 'nearby',
					limit: 15,
					// Mapbox-first discovery keeps provider costs predictable while still
					// allowing explicit Google fallback when requested.
					includeProviderDiscovery: true,
					includeMapboxPlaces,
					includeGooglePlaces,
					mergeWithDatabase: true
				}
			});

			if (error) {
				return this.listNearby(lat, lng, radius / 1000);
			}

			const rawHospitals = data?.data || [];

			// If Edge Function returned no results, fall back to direct RPC
			// (Edge Function may succeed but return empty when Google Places is unavailable)
			if (rawHospitals.length === 0) {
				return this.listNearby(lat, lng, radius / 1000);
			}

			const hydrated = await this._hydrateHospitalRows(rawHospitals);
			return hydrated.map(h => this._mapHospital(h));

		} catch (error) {
			console.error("hospitalsService.discoverNearby error:", error);
			return this.listNearby(lat, lng, radius / 1000);
		}
	},

	/**
	 * Get a single hospital by ID
	 * @param {string} id 
	 */
	async getById(id) {
		try {
			if (!id) return null;

			// Resolve Display ID (HSP-XXXXXX) to UUID if necessary
			const resolvedId = await resolveEntityId(id);
			if (!resolvedId || !isValidUUID(resolvedId)) {
				return null;
			}

			const { data, error } = await supabase
				.from("hospitals")
				.select("*")
				.eq("id", resolvedId)
				.single();

			if (error) throw error;
			return this._mapHospital(data);
		} catch (err) {
			console.error(`hospitalsService.getById error for ${id}:`, err);
			return null;
		}
	},

	/**
	 * Get available rooms for a hospital
	 * @param {string} hospitalId 
	 */
	async getRooms(hospitalId) {
		try {
			const { data, error } = await supabase
				.from("hospital_rooms")
				.select("*")
				.eq("hospital_id", hospitalId)
				.eq("status", "available")
				.order("room_number");

			if (error) throw error;
			return data || [];
		} catch (err) {
			const isMissingTable =
				err?.code === "PGRST205" &&
				String(err?.message || "").toLowerCase().includes("hospital_rooms");
			if (isMissingTable) {
				if (__DEV__ && !hasWarnedMissingHospitalRoomsTable) {
					hasWarnedMissingHospitalRoomsTable = true;
					console.warn("hospitalsService.getRooms: hospital_rooms table missing; using room_pricing fallback.");
				}
				return [];
			}
			console.error("hospitalsService.getRooms error:", err);
			return [];
		}
	},

	/**
	 * Get service pricing for a hospital or organization
	 * @param {string} hospitalId 
	 * @param {string} organizationId 
	 */
	async getServicePricing(hospitalId = null, organizationId = null) {
		try {
			let query = supabase.from("service_pricing").select("*");
			if (hospitalId) {
				// Current schema is hospital-scoped; allow global (null) fallback rows if present.
				query = query.or(`hospital_id.eq.${hospitalId},hospital_id.is.null`);
			}

			const { data, error } = await query;
			if (error) throw error;

			const rows = data || [];
			if (!hospitalId) return rows;

			// Prefer hospital-specific pricing over global fallback rows so UI shows the right baseline.
			const sorted = rows.sort((a, b) => {
				const aRank = a?.hospital_id === hospitalId ? 0 : 1;
				const bRank = b?.hospital_id === hospitalId ? 0 : 1;
				if (aRank !== bRank) return aRank - bRank;

				const aKey = String(a?.service_type || a?.service_name || "");
				const bKey = String(b?.service_type || b?.service_name || "");
				return aKey.localeCompare(bKey);
			});

			// Collapse duplicate service types (global + hospital rows) after sorting.
			const seen = new Set();
			return sorted.filter((row) => {
				const key = String(row?.service_type || "");
				if (!key) return true;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		} catch (err) {
			console.error("hospitalsService.getServicePricing error:", err);
			return [];
		}
	},

	/**
	 * Get room pricing for a hospital or organization
	 * @param {string} hospitalId 
	 * @param {string} organizationId 
	 */
	async getRoomPricing(hospitalId = null, organizationId = null) {
		try {
			let query = supabase.from("room_pricing").select("*");
			if (hospitalId) {
				query = query.or(`hospital_id.eq.${hospitalId},hospital_id.is.null`);
			}

			const { data, error } = await query;
			if (error) throw error;

			const rows = data || [];
			if (!hospitalId) return rows;

			// Prefer hospital-specific room pricing over global fallback rows for virtual room rendering.
			const sorted = rows.sort((a, b) => {
				const aRank = a?.hospital_id === hospitalId ? 0 : 1;
				const bRank = b?.hospital_id === hospitalId ? 0 : 1;
				if (aRank !== bRank) return aRank - bRank;

				const aKey = String(a?.room_type || a?.room_name || "");
				const bKey = String(b?.room_type || b?.room_name || "");
				return aKey.localeCompare(bKey);
			});

			// Collapse duplicate room types (global + hospital rows) to avoid duplicate React keys.
			const seen = new Set();
			return sorted.filter((row) => {
				const key = String(row?.room_type || "");
				if (!key) return true;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		} catch (err) {
			console.error("hospitalsService.getRoomPricing error:", err);
			return [];
		}
	},

	/**
	 * Calculate dynamic wait time for hospital
	 */
	calculateDynamicWaitTime(hospital, userLocation, currentTime = new Date()) {
		try {
			// Base wait time factors
			const factors = {
				distance: hospital.distanceKm || 0,
				rating: hospital.rating || 0,
				verified: hospital.verified || false,
				availableBeds: hospital.availableBeds || 0,
				hourOfDay: currentTime.getHours(),
				dayOfWeek: currentTime.getDay(),
				emergencyLevel: hospital.emergencyLevel || 'Standard'
			};

			const travelTime = factors.distance === 0 ? 0 : Math.max(5, factors.distance * 5 + 5);
			let loadFactor = factors.availableBeds === 0 ? 3.0 : (factors.availableBeds < 5 ? 2.0 : (factors.availableBeds > 20 ? 0.8 : 1.0));

			const hour = factors.hourOfDay;
			let timeFactor = ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) ? 1.5 : (hour >= 0 && hour <= 6 ? 0.7 : 1.0);
			let dayFactor = (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) ? 1.3 : 1.0;
			let qualityFactor = (factors.verified && factors.rating >= 4.0) ? 0.9 : 1.0;
			let emergencyFactor = (factors.emergencyLevel === 'Level 1 Trauma Center') ? 1.2 : 1.0;

			const baseWaitTime = 15;
			const rawWait = baseWaitTime * loadFactor * timeFactor * dayFactor * qualityFactor * emergencyFactor;
			const calculatedWaitTime = Number.isFinite(rawWait) ? Math.max(5, Math.round(rawWait)) : 15;
			const totalTime = Number.isFinite(travelTime) ? Math.round(travelTime + calculatedWaitTime) : calculatedWaitTime;

			let confidence = (factors.verified && factors.rating > 0) ? 'High' : (hospital.placeId ? 'Medium' : 'Low');
			let waitDescription = calculatedWaitTime <= 15 ? 'Short wait' : (calculatedWaitTime <= 30 ? 'Moderate wait' : (calculatedWaitTime <= 60 ? 'Long wait' : 'Very long wait'));

			return {
				waitTimeMinutes: calculatedWaitTime,
				travelTimeMinutes: Math.round(travelTime),
				totalTimeMinutes: totalTime,
				waitDescription,
				confidence,
				factors: {
					distance: `${factors.distance}km`,
					availableBeds: factors.availableBeds,
					hourOfDay: `${factors.hourOfDay}:00`,
					isRushHour: timeFactor > 1.0,
					isWeekend: dayFactor > 1.0,
					isVerified: factors.verified
				},
				displayText: `${waitDescription} (~${calculatedWaitTime}min)`,
				totalDisplayText: `~${totalTime}min total`
			};
		} catch (error) {
			console.error('Error calculating wait time:', error);
			return { waitTimeMinutes: 30, travelTimeMinutes: 15, totalTimeMinutes: 45, waitDescription: 'Moderate wait', confidence: 'Low', displayText: 'Moderate wait (~30min)', totalDisplayText: '~45min total' };
		}
	}
};
