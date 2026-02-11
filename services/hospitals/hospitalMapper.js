/**
 * Internal helper to map database schema to application domain model
 * @param {Object} h - Hospital DB row
 * @returns {Object} Mapped hospital object
 */
export const mapHospitalFromDb = (h) => {
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
};
