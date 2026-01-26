import { supabase } from "./supabase";

/**
 * Service to handle hospital data operations
 */
export const hospitalsService = {
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

			// Map database fields to application domain model
			return (data || []).map((h) => ({
				id: h.id,
				name: h.name,
				address: h.google_address || h.address, // Prefer Google data
				phone: h.google_phone || h.phone, // Prefer Google data
				rating: h.google_rating || h.rating, // Prefer Google data
				type: h.type,
				image: h.image,
				specialties: h.specialties || [],
				serviceTypes: h.service_types || [],
				features: h.features || [],
				emergencyLevel: h.emergency_level,
				availableBeds: h.available_beds,
				ambulances: h.ambulances_count || 3, // Default to 3 ambulances if not specified
				waitTime: h.wait_time,
				price: h.price_range,
				coordinates: {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				verified: h.verified,
				status: h.status, lastAvailabilityUpdate: h.last_availability_update, bedAvailability: h.bed_availability, ambulanceAvailability: h.ambulance_availability, emergencyWaitTimeMinutes: h.emergency_wait_time_minutes, realTimeSync: h.real_time_sync,
				// New Google Places fields
				placeId: h.place_id,
				googleWebsite: h.google_website,
				googlePhotos: h.google_photos,
				googleTypes: h.google_types,
				importStatus: h.import_status, importedFromGoogle: h.imported_from_google,
				orgAdminId: h.org_admin_id,
			}));
		} catch (err) {
			console.error("hospitalsService.list error:", err);
			throw err;
		}
	},

	/**
	 * Fetch nearby hospitals with distance calculations
	 * @param {number} userLat - User latitude
	 * @param {number} userLng - User longitude  
	 * @param {number} radiusKm - Search radius in kilometers (default: 50)
	 * @returns {Promise<Array>} List of nearby hospitals with distance info
	 */
	async listNearby(userLat, userLng, radiusKm = 50) {
		try {
			// Use the PostGIS nearby_hospitals function
			const { data, error } = await supabase
				.rpc('nearby_hospitals', {
					user_lat: userLat,
					user_lng: userLng,
					radius_km: radiusKm
				});

			if (error) throw error;

			// Map database fields to application domain model with distance
			return (data || []).map((h) => ({
				id: h.id,
				name: h.name,
				address: h.google_address || h.address, // Prefer Google data
				phone: h.google_phone || h.phone, // Prefer Google data
				rating: h.google_rating || h.rating, // Prefer Google data
				type: h.type,
				image: h.image,
				specialties: h.specialties || [],
				serviceTypes: h.service_types || [],
				features: h.features || [],
				emergencyLevel: h.emergency_level,
				availableBeds: h.available_beds,
				ambulances: h.ambulances_count || 3, // Default to 3 ambulances if not specified
				waitTime: h.wait_time,
				price: h.price_range,
				distance: `${Math.round(h.distance_km * 10) / 10} km`, // Format distance
				distanceKm: h.distance_km, // Raw distance for calculations
				coordinates: {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				verified: h.verified,
				status: h.status, lastAvailabilityUpdate: h.last_availability_update, bedAvailability: h.bed_availability, ambulanceAvailability: h.ambulance_availability, emergencyWaitTimeMinutes: h.emergency_wait_time_minutes, realTimeSync: h.real_time_sync,
				// New Google Places fields
				placeId: h.place_id,
				googleWebsite: h.google_website,
				googlePhotos: h.google_photos,
				googleTypes: h.google_types,
				importStatus: h.import_status, importedFromGoogle: h.imported_from_google,
				orgAdminId: h.org_admin_id,
			}));
		} catch (err) {
			console.error("hospitalsService.listNearby error:", err);
			throw err;
		}
	},

	/**
	 * Discover nearby hospitals using unified Edge Function
	 * @param {number} lat - Latitude
	 * @param {number} lng - Longitude
	 * @param {number} radius - Radius in meters (default 5000)
	 */
	async discoverNearby(lat, lng, radius = 5000) {
		try {
			console.log('[hospitalsService] Discovering hospitals...', { lat, lng, radius });

			// Invoke the unified Edge Function
			const { data, error } = await supabase.functions.invoke('discover-hospitals', {
				body: { 
					latitude: lat, 
					longitude: lng, 
					radius,
					mode: 'nearby',
					limit: 10,
					includeGooglePlaces: true,
					mergeWithDatabase: true
				}
			});

			if (error) {
				console.log('[hospitalsService] Edge Function unavailable, using fallback:', error.message);
				// Fallback to standard listNearby if Edge Function fails
				return this.listNearby(lat, lng, radius / 1000);
			}

			// The unified Edge Function returns the same structure as nearby_hospitals RPC
			const rawHospitals = data?.data || [];

			return rawHospitals.map((h) => ({
				id: h.id,
				name: h.name,
				address: h.google_address || h.address,
				phone: h.google_phone || h.phone,
				rating: h.google_rating || h.rating,
				type: h.type || 'General',
				image: h.image || (h.google_photos && h.google_photos[0]) || null,
				specialties: h.specialties || [],
				serviceTypes: h.service_types || [],
				features: h.features || [],
				emergencyLevel: h.emergency_level || 'Standard',
				availableBeds: h.available_beds || 0,
				ambulances: h.ambulances_count || 0,
				waitTime: h.wait_time || 'Unknown',
				price: h.price_range || 'Unknown',
				distance: `${Math.round((h.distance_km || 0) * 10) / 10} km`,
				distanceKm: h.distance_km || 0,
				coordinates: {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				verified: h.verified || false,
				status: h.status || 'unknown',
				// Google Fields
				placeId: h.place_id,
				googleTypes: h.google_types,
				importStatus: h.import_status, importedFromGoogle: h.imported_from_google,
				// UI Helpers
				isCovered: h.verified === true && h.status === 'available',
				// Flag for Google-only results
				isGoogleOnly: h.google_only || false
			}));

		} catch (error) {
			console.error("hospitalsService.discoverNearby error:", error);
			// Fallback to standard listNearby if Edge Function fails
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
			if (!data) return null;

			// Reuse the mapping logic or extract it to a helper if complex
			// For now, inline mapping for single item
			const h = data;
			return {
				id: h.id,
				name: h.name,
				address: h.address,
				phone: h.phone,
				rating: h.rating,
				type: h.type,
				image: h.image,
				specialties: h.specialties || [],
				serviceTypes: h.service_types || [],
				features: h.features || [],
				emergencyLevel: h.emergency_level,
				availableBeds: h.available_beds,
				ambulances: h.ambulances_count || 3, // Default to 3 ambulances if not specified
				waitTime: h.wait_time,
				price: h.price_range,
				coordinates: {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				verified: h.verified,
				status: h.status, lastAvailabilityUpdate: h.last_availability_update, bedAvailability: h.bed_availability, ambulanceAvailability: h.ambulance_availability, emergencyWaitTimeMinutes: h.emergency_wait_time_minutes, realTimeSync: h.real_time_sync,
			};
		} catch (err) {
			console.error("hospitalsService.getById error:", err);
			throw err;
		}
	},

	/**
	 * Calculate dynamic wait time for hospital
	 * Simple client-side approach without database changes
	 * @param {Object} hospital - Hospital object with basic info
	 * @param {Object} userLocation - User's current location
	 * @param {Object} currentTime - Current time (optional, defaults to now)
	 * @returns {Object} Wait time information with confidence level
	 */
	calculateDynamicWaitTime(hospital, userLocation, currentTime = new Date()) {
		try {
			// Base wait time factors (simple, production-ready algorithm)
			const factors = {
				distance: hospital.distanceKm || 0,
				rating: hospital.rating || 0,
				verified: hospital.verified || false,
				availableBeds: hospital.availableBeds || 0,
				hourOfDay: currentTime.getHours(),
				dayOfWeek: currentTime.getDay(),
				emergencyLevel: hospital.emergencyLevel || 'Standard'
			};

			// 1. Distance-based time (5 min per km + 5 min base)
			const travelTime = Math.max(5, factors.distance * 5 + 5);

			// 2. Hospital load factor (based on available beds)
			let loadFactor = 1.0;
			if (factors.availableBeds === 0) {
				loadFactor = 3.0; // No beds = high wait
			} else if (factors.availableBeds < 5) {
				loadFactor = 2.0; // Few beds = moderate wait
			} else if (factors.availableBeds > 20) {
				loadFactor = 0.8; // Many beds = lower wait
			}

			// 3. Time of day factor (rush hours)
			let timeFactor = 1.0;
			const hour = factors.hourOfDay;
			if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) {
				timeFactor = 1.5; // Rush hours
			} else if (hour >= 0 && hour <= 6) {
				timeFactor = 0.7; // Overnight
			}

			// 4. Day of week factor
			let dayFactor = 1.0;
			if (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) { // Weekend
				dayFactor = 1.3;
			}

			// 5. Quality factor (verified hospitals with good ratings)
			let qualityFactor = 1.0;
			if (factors.verified && factors.rating >= 4.0) {
				qualityFactor = 0.9; // Better hospitals = slightly more efficient
			}

			// 6. Emergency level factor
			let emergencyFactor = 1.0;
			if (factors.emergencyLevel === 'Level 1 Trauma Center') {
				emergencyFactor = 1.2; // Trauma centers are busier
			}

			// Calculate base wait time (in minutes)
			const baseWaitTime = 15; // 15 minutes average ER wait
			const calculatedWaitTime = Math.round(
				baseWaitTime * 
				loadFactor * 
				timeFactor * 
				dayFactor * 
				qualityFactor * 
				emergencyFactor
			);

			// Total time = travel + wait
			const totalTime = Math.round(travelTime + calculatedWaitTime);

			// Confidence level based on data quality
			let confidence = 'Medium';
			if (factors.verified && factors.rating > 0) {
				confidence = 'High';
			} else if (!hospital.placeId) {
				confidence = 'Low';
			}

			// Human-readable wait time description
			let waitDescription = '';
			if (calculatedWaitTime <= 15) {
				waitDescription = 'Short wait';
			} else if (calculatedWaitTime <= 30) {
				waitDescription = 'Moderate wait';
			} else if (calculatedWaitTime <= 60) {
				waitDescription = 'Long wait';
			} else {
				waitDescription = 'Very long wait';
			}

			return {
				waitTimeMinutes: calculatedWaitTime,
				travelTimeMinutes: Math.round(travelTime),
				totalTimeMinutes: totalTime,
				waitDescription,
				confidence,
				factors: {
					distance: `${factors.distance}km`,
					availableBeds: factors.availableBeds,
					hourOfDay: `${hour}:00`,
					isRushHour: timeFactor > 1.0,
					isWeekend: dayFactor > 1.0,
					isVerified: factors.verified
				},
				// For UI display
				displayText: `${waitDescription} (~${calculatedWaitTime}min)`,
				totalDisplayText: `~${totalTime}min total`
			};

		} catch (error) {
			console.error('Error calculating wait time:', error);
			// Fallback to conservative estimate
			return {
				waitTimeMinutes: 30,
				travelTimeMinutes: 15,
				totalTimeMinutes: 45,
				waitDescription: 'Moderate wait',
				confidence: 'Low',
				displayText: 'Moderate wait (~30min)',
				totalDisplayText: '~45min total'
			};
		}
	}
};
