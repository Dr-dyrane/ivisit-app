import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../services/supabase";
import { SPECIALTIES } from "../constants/hospitals";
import { emergencyRequestsService } from "../services/emergencyRequestsService";
import { normalizeEmergencyState } from "../utils/domainNormalize";
import { simulationService } from "../services/simulationService";
import * as Location from "expo-location";

import { notificationDispatcher } from "../services/notificationDispatcher";
import { useNotifications } from "./NotificationsContext";
import { useHospitals } from "../hooks/emergency/useHospitals";
import { useAmbulances } from "../hooks/emergency/useAmbulances";

// Create the emergency context
const EmergencyContext = createContext();

// Emergency modes
export const EmergencyMode = {
	EMERGENCY: "emergency",
	BOOKING: "booking",
};

// Emergency provider component
export function EmergencyProvider({ children }) {
    const { addNotification } = useNotifications();
    // Fetch real hospitals from Supabase
    const { hospitals: dbHospitals, isLoading: isLoadingHospitals } = useHospitals();
    // Fetch real ambulances
    const { ambulances: activeAmbulances } = useAmbulances();

	// Computed state for hospitals (mock location for now + DB data)
	const [hospitals, setHospitals] = useState([]);
    
    // Sync DB hospitals when loaded, but still randomize location for demo purposes
    // In a real app, you'd use PostGIS to query nearby hospitals
    useEffect(() => {
        // If loading or no hospitals, do nothing
        if (isLoadingHospitals || dbHospitals.length === 0) return;

        // If we don't have user location yet, just use the DB data as is (real coords)
        if (!userLocation) {
             const normalized = dbHospitals.map(h => ({
                ...h,
                coordinates: h.coordinates || { latitude: h.latitude, longitude: h.longitude },
                specialties: h.specialties || [],
                serviceTypes: h.serviceTypes || [],
                features: h.features || [],
            }));
            setHospitals(normalized);
            return;
        }

        // If we DO have user location, apply the "random nearby" logic here once
        // This ensures consistent IDs and locations for the session
        const localized = dbHospitals.map((h, index) => {
            // We'll use a pseudo-random based on the hospital ID characters to be deterministic
            // so it doesn't jump if the user moves slightly
            const seed = h.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            
            // Limit "nearby" (visible in km view) to first 5 hospitals for clarity
            // Place others further away (mile view)
            const isNearby = index < 5; 
            
            let latOffset, lngOffset;
            
            if (isNearby) {
                 // Nearby: 0.5km - 3km radius
                 const angle = ((seed % 360) / 360) * Math.PI * 2;
                 const distance = 0.005 + ((seed % 25) / 1000); // 0.005 deg is approx 500m
                 latOffset = Math.sin(angle) * distance;
                 lngOffset = Math.cos(angle) * distance;
            } else {
                 // Far away: 10km - 50km radius
                 // Just to show we have more data available if they scroll/zoom out
                 const angle = ((seed % 360) / 360) * Math.PI * 2;
                 const distance = 0.1 + ((seed % 50) / 100); // 0.1 deg is approx 11km
                 latOffset = Math.sin(angle) * distance;
                 lngOffset = Math.cos(angle) * distance;
            }

            const latDiff = latOffset;
            const lngDiff = lngOffset;
            const distanceKm = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111;
            const etaMins = Math.max(2, Math.ceil(distanceKm * 3));

             return {
                ...h,
                coordinates: {
                    latitude: userLocation.latitude + latOffset,
                    longitude: userLocation.longitude + lngOffset,
                },
                distance: `${distanceKm.toFixed(1)} km`,
                eta: `${etaMins} mins`,
                specialties: h.specialties || [],
                serviceTypes: h.serviceTypes || [],
                features: h.features || [],
            };
        });

        setHospitals(localized);
        
    }, [dbHospitals, isLoadingHospitals, userLocation]);

    // Fetch User Location on Mount (for context-aware data)
    useEffect(() => {
        (async () => {
             try {
                // Try last known first for speed
                const lastKnown = await Location.getLastKnownPositionAsync({});
                if (lastKnown) {
                    setUserLocation({
                        latitude: lastKnown.coords.latitude,
                        longitude: lastKnown.coords.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    });
                }
                
                // Then try to get permission and fresh location if needed
                // We don't want to block the app or show alerts here, just silently try
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    });
                }
            } catch (e) {
                // Ignore errors here, Map component will handle explicit permission requests
                console.log("Context location fetch failed (silent):", e);
            }
        })();
    }, []);

	const [selectedHospitalId, setSelectedHospitalId] = useState(null);
	const [mode, setMode] = useState(EmergencyMode.EMERGENCY);
	const [activeAmbulanceTrip, setActiveAmbulanceTrip] = useState(null);
	const [activeBedBooking, setActiveBedBooking] = useState(null);
	
	// Emergency mode state
	const [serviceType, setServiceType] = useState(null); // null = show all, "premium" or "standard"
	
	// Booking mode state
	const [selectedSpecialty, setSelectedSpecialty] = useState(null); // null = show all
	
	// View state
	const [viewMode, setViewMode] = useState("map"); // "map" or "list"
	
	// User location (for map centering and distance calculations)
	const [userLocation, setUserLocation] = useState(null);

    // Helper to parse WKT Point
    const parsePoint = (wkt) => {
        if (!wkt || typeof wkt !== 'string' || !wkt.startsWith('POINT')) return null;
        try {
            const matches = wkt.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (matches && matches.length === 3) {
                return { longitude: parseFloat(matches[1]), latitude: parseFloat(matches[2]) };
            }
        } catch (e) { return null; }
        return null;
    };

    // Real-time Subscription to Emergency Requests
    useEffect(() => {
        let subscription;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            subscription = supabase
                .channel('emergency_updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'emergency_requests',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newRecord = payload.new;
                        // console.log("Realtime Update:", newRecord.status, newRecord.responder_location);

                        if (newRecord.status === 'completed' || newRecord.status === 'cancelled') {
                             setActiveAmbulanceTrip(null);
                             simulationService.stopSimulation();
                             return;
                        }

                        if (activeAmbulanceTrip && activeAmbulanceTrip.requestId === newRecord.request_id) {
                            // Status Change Notification
                            if (activeAmbulanceTrip.status !== newRecord.status && newRecord.status === 'accepted') {
                                // Trigger haptic or sound here if possible, or just let UI handle it
                            }

                            // Update Responder Location
                            const loc = parsePoint(newRecord.responder_location);
                            
                            setActiveAmbulanceTrip(prev => ({
                                ...prev,
                                status: newRecord.status,
                                assignedAmbulance: newRecord.responder_name ? {
                                    id: newRecord.ambulance_id || 'ems_001',
                                    type: newRecord.responder_vehicle_type || 'Ambulance',
                                    plate: newRecord.responder_vehicle_plate,
                                    name: newRecord.responder_name,
                                    phone: newRecord.responder_phone,
                                    location: loc,
                                    heading: newRecord.responder_heading || 0
                                } : prev.assignedAmbulance,
                                // If we have a location from DB, pass it so Map can animate
                                currentResponderLocation: loc, 
                                currentResponderHeading: newRecord.responder_heading
                            }));
                        }
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
            simulationService.stopSimulation();
        };
    }, []); // Removed dependency on activeAmbulanceTrip to avoid re-subscribing

	useEffect(() => {
		let isActive = true;
		(async () => {
            // Load active request from Supabase/Local via Service
			const activeRequests = await emergencyRequestsService.list();
            const active = activeRequests.find(r => r.status === 'in_progress' || r.status === 'accepted');
			
			if (!isActive) return;

            // Restore state if found
            if (active) {
                if (active.serviceType === 'ambulance') {
                    setActiveAmbulanceTrip({
                        hospitalId: active.hospitalId,
                        requestId: active.requestId,
                        // ... map other fields if needed
                        status: active.status
                    });
                    // Resume simulation if needed
                    if (active.status === 'in_progress' || active.status === 'accepted') {
                         // We don't have route here easily, but Realtime will pick it up
                    }
                } else if (active.serviceType === 'bed') {
                    setActiveBedBooking({
                        hospitalId: active.hospitalId,
                        requestId: active.requestId,
                        status: active.status
                    });
                }
            }
		})();
		return () => {
			isActive = false;
		};
	}, []);

    // We don't need to manually save state anymore, Supabase handles it.
	// useEffect(() => {
	// 	emergencyStateService.set({ mode, activeAmbulanceTrip, activeBedBooking }).catch(() => {});
	// }, [activeAmbulanceTrip, activeBedBooking, mode]);

	// Get selected hospital object
	const selectedHospital = useMemo(() => {
		return hospitals.find(h => h.id === selectedHospitalId) || null;
	}, [hospitals, selectedHospitalId]);

	// Filter hospitals based on current mode and criteria
	const filteredHospitals = useMemo(() => {
		if (!hospitals || hospitals.length === 0) return [];
		
		return hospitals.filter((hospital) => {
			if (!hospital) return false;
			
			if (mode === EmergencyMode.EMERGENCY) {
				// Emergency: show all by default, filter by service type if selected
				if (!serviceType) return true; // Show all if no filter selected
				// Ensure case-insensitive comparison
				const type = serviceType.toLowerCase();
				return (hospital.serviceTypes || []).some(t => t.toLowerCase() === type) || (hospital.type || "").toLowerCase() === type;
			} else {
				// Booking: show all with available beds by default, filter by specialty if selected
				if (!hospital.availableBeds || hospital.availableBeds <= 0) return false;
				if (!selectedSpecialty) return true; // Show all if no specialty selected
				return (hospital.specialties || []).includes(selectedSpecialty);
			}
		});
	}, [hospitals, mode, serviceType, selectedSpecialty]);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		if (mode === EmergencyMode.EMERGENCY) {
			return serviceType !== null;
		} else {
			return selectedSpecialty !== null;
		}
	}, [mode, serviceType, selectedSpecialty]);

	// Reset all filters
	const resetFilters = useCallback(() => {
		setServiceType(null);
		setSelectedSpecialty(null);
		setSelectedHospitalId(null);
	}, []);

	// Actions
	const selectHospital = useCallback((hospitalId) => {
		setSelectedHospitalId(hospitalId);
	}, []);

	const clearSelectedHospital = useCallback(() => {
		setSelectedHospitalId(null);
	}, []);

	const parseEtaToSeconds = useCallback((eta) => {
		if (!eta || typeof eta !== "string") return null;
		const lower = eta.toLowerCase();
		const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
		if (minutesMatch) return Number(minutesMatch[1]) * 60;
		const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
		if (secondsMatch) return Number(secondsMatch[1]);
		return null;
	}, []);

	const startAmbulanceTrip = useCallback(
		(trip) => {
			if (!trip?.hospitalId) return;
			const etaSeconds =
				Number.isFinite(trip?.etaSeconds) ? trip.etaSeconds : parseEtaToSeconds(trip?.estimatedArrival);

			const byId =
				trip?.ambulanceId
					? activeAmbulances.find((a) => a?.id === trip.ambulanceId) ?? null
					: null;
			const byHospital =
				trip?.hospitalName
					? activeAmbulances.find((a) => a?.hospital === trip.hospitalName) ?? null
					: null;
			const fallback =
				activeAmbulances.find((a) => a?.status === "available") ??
				activeAmbulances[0] ??
				null;

			const assignedAmbulance = byId ?? byHospital ?? fallback;

			setActiveAmbulanceTrip({
				hospitalId: trip.hospitalId,
				requestId: trip.requestId ?? null,
				ambulanceId: assignedAmbulance?.id ?? trip.ambulanceId ?? null,
				ambulanceType: trip.ambulanceType ?? assignedAmbulance?.type ?? null,
				estimatedArrival: trip.estimatedArrival ?? null,
				etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
				assignedAmbulance,
				startedAt: Number.isFinite(trip?.startedAt) ? trip.startedAt : Date.now(),
			});

            // Start Simulation on "Server" (which is just a service here)
            if (trip.requestId && trip.route) {
                simulationService.startSimulation(trip.requestId, trip.route);
            }
		},
		[parseEtaToSeconds]
	);

	const stopAmbulanceTrip = useCallback(() => {
		setActiveAmbulanceTrip(null);
	}, []);

	const startBedBooking = useCallback(
		(booking) => {
			if (!booking?.hospitalId) return;
			const etaSeconds =
				Number.isFinite(booking?.etaSeconds)
					? booking.etaSeconds
					: parseEtaToSeconds(booking?.estimatedWait ?? booking?.estimatedArrival);

			setActiveBedBooking({
				hospitalId: booking.hospitalId,
				bookingId: booking.bookingId ?? booking.requestId ?? null,
				requestId: booking.requestId ?? booking.bookingId ?? null,
				bedNumber: booking.bedNumber ?? null,
				bedType: booking.bedType ?? null,
				bedCount: booking.bedCount ?? null,
				specialty: booking.specialty ?? null,
				hospitalName: booking.hospitalName ?? null,
				estimatedWait: booking.estimatedWait ?? booking.estimatedArrival ?? null,
				etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
				startedAt: Number.isFinite(booking?.startedAt) ? booking.startedAt : Date.now(),
			});
		},
		[parseEtaToSeconds]
	);

	const stopBedBooking = useCallback(() => {
		setActiveBedBooking(null);
	}, []);

	const toggleMode = useCallback(() => {
		setMode(prevMode => 
			prevMode === EmergencyMode.EMERGENCY 
				? EmergencyMode.BOOKING 
				: EmergencyMode.EMERGENCY
		);
		setSelectedHospitalId(null); // Clear selection on mode change
	}, []);

	const selectSpecialty = useCallback((specialty) => {
		setSelectedSpecialty(specialty);
		setSelectedHospitalId(null); // Clear selection on specialty change
	}, []);

	const selectServiceType = useCallback((type) => {
		setServiceType(type ? type.toLowerCase() : null);
		setSelectedHospitalId(null); // Clear selection on type change
	}, []);

	const toggleViewMode = useCallback(() => {
		setViewMode(prevMode => prevMode === "map" ? "list" : "map");
	}, []);

	// Enrich hospitals with dynamic service types
	const enrichHospitals = useCallback((newHospitals) => {
		return newHospitals.map((hospital, index) => {
            // If already has serviceTypes from DB, rely on them mostly, but ensure array
            if (hospital.serviceTypes && Array.isArray(hospital.serviceTypes) && hospital.serviceTypes.length > 0) {
                return hospital;
            }

			// Determine service types - allow some hospitals to offer both
			let serviceTypes = [];
			
			if (hospital.type === "premium") {
				serviceTypes = ["premium"];
				// Some premium hospitals also offer standard service (30% of premium)
				if (index % 3 === 0) {
					serviceTypes.push("standard");
				}
			} else {
				serviceTypes = ["standard"];
				// Some standard hospitals also offer premium service (20% of standard)
				if (index % 5 === 0) {
					serviceTypes.push("premium");
				}
			}
			
			return {
				...hospital,
				serviceTypes,
			};
		});
	}, []);

	const normalizeHospitals = useCallback((input) => {
		if (!Array.isArray(input)) return [];
		const isValidCoordinate = (coordinate) =>
			Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

		return input
			.filter(Boolean)
			.map((h) => {
				if (!h || !h.id) return null;
				const specialties = Array.isArray(h.specialties)
					? h.specialties.filter((s) => typeof s === "string")
					: [];
				const availableBeds = Number.isFinite(h.availableBeds)
					? h.availableBeds
					: typeof h.availableBeds === "string"
						? Number(h.availableBeds)
						: 0;
				const coordinates = isValidCoordinate(h.coordinates) ? h.coordinates : null;

				return {
					...h,
					specialties,
					availableBeds: Number.isFinite(availableBeds) ? availableBeds : 0,
					coordinates,
				};
			})
			.filter(Boolean);
	}, []);

	// Update hospitals (for when we integrate with API)
	const updateHospitals = useCallback((newHospitals) => {
		const normalized = normalizeHospitals(newHospitals);
		const enriched = enrichHospitals(normalized);
		setHospitals(enriched);
	}, [enrichHospitals, normalizeHospitals]);

	const value = {
		// State
		hospitals,
		selectedHospitalId,
		selectedHospital,
		filteredHospitals,
		mode,
		activeAmbulanceTrip,
		activeBedBooking,
		serviceType,
		selectedSpecialty,
		specialties: SPECIALTIES,
		viewMode,
		userLocation,
		hasActiveFilters,
		
		// Actions
		selectHospital,
		clearSelectedHospital,
		toggleMode,
		setMode,
		startAmbulanceTrip,
		stopAmbulanceTrip,
		startBedBooking,
		stopBedBooking,
		selectSpecialty,
		selectServiceType,
		toggleViewMode,
		setViewMode,
		updateHospitals,
		setUserLocation,
		resetFilters,
	};

	return (
		<EmergencyContext.Provider value={value}>
			{children}
		</EmergencyContext.Provider>
	);
}

// Custom hook to use the emergency context
export function useEmergency() {
	const context = useContext(EmergencyContext);
	if (context === undefined) {
		throw new Error("useEmergency must be used within an EmergencyProvider");
	}
	return context;
}
