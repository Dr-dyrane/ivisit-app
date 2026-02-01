import { supabase } from "./supabase";

/**
 * Service to handle hospital data operations
 */
export const hospitalsService = {
	/**
	 * Internal helper to map database schema to application domain model
	 * @private
	 */
	_mapHospital(h) {
		if (!h) return null;

		// Business Logic Constraints for Minimal Initial Launch:
		// 1. Most hospitals have 0 ambulances (simplified UX)
		// 2. Default beds to what's in DB, but ensure UI handles 0 gracefully

		return {
			id: h.id,
			name: h.name,
			address: h.google_address || h.address,
			phone: h.google_phone || h.phone,
			rating: h.google_rating || h.rating || 0,
			type: h.type || 'General',
			image: h.image || (h.google_photos && h.google_photos[0]) || null,
			specialties: h.specialties || [],
			serviceTypes: h.service_types || [],
			features: h.features || [],
			emergencyLevel: h.emergency_level || 'Standard',
			availableBeds: h.available_beds || 0,
			// Simplified UX: default to 0 ambulances unless explicitly set to something else in DB
			// The user specified "no hospitals have ambulances" to keep things simple for now.
			ambulances: h.ambulances_count || 0,
			waitTime: h.emergency_wait_time_minutes ? `${h.emergency_wait_time_minutes} min` : (h.wait_time || 'Unknown'),
			price: h.price_range || 'Unknown',
			distance: h.distance_km ? `${Math.round(h.distance_km * 10) / 10} km` : '0 km',
			distanceKm: h.distance_km || 0,
			coordinates: {
				latitude: h.latitude,
				longitude: h.longitude,
			},
			verified: h.verified || false,
			status: h.status || 'available',
			lastAvailabilityUpdate: h.last_availability_update,
			bedAvailability: h.bed_availability,
			ambulanceAvailability: h.ambulance_availability,
			emergencyWaitTimeMinutes: h.emergency_wait_time_minutes,
			realTimeSync: h.real_time_sync || false,
			// Google/External Fields
			placeId: h.place_id,
			googleWebsite: h.google_website,
			googlePhotos: h.google_photos,
			googleTypes: h.google_types,
			importStatus: h.import_status,
			importedFromGoogle: h.imported_from_google || false,
			orgAdminId: h.org_admin_id,
			// Computed UI helpers
			isCovered: h.verified === true && h.status === 'available',
			isGoogleOnly: h.google_only || h.import_status === 'google_only' || false
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
			return (data || []).map(h => this._mapHospital(h));
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
	 */
	async discoverNearby(lat, lng, radius = 50000) {
		try {
			console.log('[hospitalsService] Discovering hospitals...', { lat, lng, radius });

			const { data, error } = await supabase.functions.invoke('discover-hospitals', {
				body: {
					latitude: lat,
					longitude: lng,
					radius,
					mode: 'nearby',
					limit: 15,
					includeGooglePlaces: true,
					mergeWithDatabase: true
				}
			});

			if (error) {
				console.log('[hospitalsService] Edge Function error, falling back to RPC:', error.message);
				return this.listNearby(lat, lng, radius / 1000);
			}

			const rawHospitals = data?.data || [];
			return rawHospitals.map(h => this._mapHospital(h));

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
			const { data, error } = await supabase
				.from("hospitals")
				.select("*")
				.eq("id", id)
				.single();

			if (error) throw error;
			return this._mapHospital(data);
		} catch (err) {
			console.error("hospitalsService.getById error:", err);
			throw err;
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

			const travelTime = Math.max(5, factors.distance * 5 + 5);
			let loadFactor = factors.availableBeds === 0 ? 3.0 : (factors.availableBeds < 5 ? 2.0 : (factors.availableBeds > 20 ? 0.8 : 1.0));

			const hour = factors.hourOfDay;
			let timeFactor = ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) ? 1.5 : (hour >= 0 && hour <= 6 ? 0.7 : 1.0);
			let dayFactor = (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) ? 1.3 : 1.0;
			let qualityFactor = (factors.verified && factors.rating >= 4.0) ? 0.9 : 1.0;
			let emergencyFactor = (factors.emergencyLevel === 'Level 1 Trauma Center') ? 1.2 : 1.0;

			const baseWaitTime = 15;
			const calculatedWaitTime = Math.round(baseWaitTime * loadFactor * timeFactor * dayFactor * qualityFactor * emergencyFactor);
			const totalTime = Math.round(travelTime + calculatedWaitTime);

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
