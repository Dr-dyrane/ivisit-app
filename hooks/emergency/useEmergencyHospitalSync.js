/**
 * useEmergencyHospitalSync.js
 *
 * Owns: hospitals state, syncing from useHospitals query,
 * distance/ETA localization, coverage-scoped filtering, specialty derivation,
 * hospital selection guard, and the updateHospitals + refreshHospitals actions.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useHospitals } from "./useHospitals";
import { useAmbulances } from "./useAmbulances";
import { demoEcosystemService } from "../../services/demoEcosystemService";
import { SPECIALTIES } from "../../constants/hospitals";
import { EmergencyMode } from "../../contexts/EmergencyContext";
import { enrichHospitalsWithServiceTypes, normalizeCoordinate } from "../../utils/emergencyContextHelpers";
import { isValidCoordinate } from "../../utils/mapUtils";
import {
	coverageModeService,
	COVERAGE_MODES,
} from "../../services/coverageModeService";

export function useEmergencyHospitalSync({
	userLocation,
	demoOwnerSlug,
	forceDemoFetch,
	effectiveCoverageMode,
	effectiveDemoModeEnabled,
	mode,
	serviceType,
	selectedSpecialty,
	selectedHospitalId,
	setSelectedHospitalId,
}) {
	const { user } = useAuth();
	const [hospitals, setHospitals] = useState([]);

	const {
		hospitals: dbHospitals,
		allHospitals: discoveredDbHospitals,
		isLoading: isLoadingHospitals,
		refetch: refetchHospitals,
	} = useHospitals({
		location: userLocation,
		demoModeEnabled: forceDemoFetch,
		demoBootstrapEnabled: false,
		skipInternalLocationLookup: true,
		userId: user?.id,
	});

	const { ambulances: activeAmbulances } = useAmbulances();

	// Sync DB hospitals into local state with distance localization
	useEffect(() => {
		if (isLoadingHospitals) return;
		const sourceHospitals =
			Array.isArray(discoveredDbHospitals) && discoveredDbHospitals.length > 0
				? discoveredDbHospitals
				: dbHospitals;

		if (sourceHospitals.length === 0) {
			setHospitals([]);
			return;
		}

		if (!userLocation) {
			const normalized = sourceHospitals.map((h) => ({
				...h,
				coordinates: h.coordinates || { latitude: h.latitude, longitude: h.longitude },
				distance: h.distance || "--",
				distanceKm: h.distanceKm || 0,
				eta: h.eta || "8-12 mins",
				specialties: h.specialties || [],
				serviceTypes: h.serviceTypes || [],
				features: h.features || [],
			}));
			setHospitals(enrichHospitalsWithServiceTypes(normalized));
			return;
		}

		const localized = sourceHospitals
			.map((h) => {
				const dbDistance = h.distance || h.distanceKm;
				const distanceKm = dbDistance
					? (typeof dbDistance === "string" ? parseFloat(dbDistance.replace(" km", "")) : dbDistance)
					: Math.sqrt(
							Math.pow(((h.coordinates?.latitude || h.latitude) - userLocation.latitude) * 111, 2) +
							Math.pow(((h.coordinates?.longitude || h.longitude) - userLocation.longitude) * 111, 2)
					  );
				const etaMins = Math.max(2, Math.ceil(distanceKm * 3));
				return {
					...h,
					coordinates: h.coordinates || { latitude: h.latitude, longitude: h.longitude },
					distance: h.distance || (distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : "--"),
					distanceKm: h.distanceKm || distanceKm,
					eta: h.eta || (distanceKm > 0 ? `${etaMins} mins` : "8-12 mins"),
					specialties: h.specialties || [],
					serviceTypes: h.serviceTypes || [],
					features: h.features || [],
				};
			})
			.sort((a, b) => {
				const aD = Number(a?.distanceKm ?? Number.MAX_SAFE_INTEGER);
				const bD = Number(b?.distanceKm ?? Number.MAX_SAFE_INTEGER);
				return aD - bD;
			});

		setHospitals(enrichHospitalsWithServiceTypes(localized));
	}, [dbHospitals, discoveredDbHospitals, isLoadingHospitals, userLocation]);

	// Hospital actions
	const normalizeHospitals = useCallback((input) => {
		if (!Array.isArray(input)) return [];
		return input
			.filter(Boolean)
			.map((h) => {
				if (!h || !h.id) return null;
				const specialties = Array.isArray(h.specialties)
					? h.specialties.filter((s) => typeof s === "string")
					: [];
				const availableBeds = Number.isFinite(h.availableBeds)
					? h.availableBeds
					: typeof h.availableBeds === "string" ? Number(h.availableBeds) : 0;
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

	const updateHospitals = useCallback((newHospitals) => {
		const normalized = normalizeHospitals(newHospitals);
		setHospitals(enrichHospitalsWithServiceTypes(normalized));
	}, [normalizeHospitals]);

	const refreshHospitals = useCallback(async () => {
		await refetchHospitals?.();
	}, [refetchHospitals]);

	// Coverage-scoped hospital views
	const availableHospitals = useMemo(() => {
		if (!Array.isArray(hospitals) || hospitals.length === 0) return [];
		return hospitals.filter((h) => demoEcosystemService.matchesDemoOwner(h, demoOwnerSlug));
	}, [demoOwnerSlug, hospitals]);

	const visibleHospitals = useMemo(() => {
		if (!Array.isArray(availableHospitals) || availableHospitals.length === 0) return [];
		let scoped = availableHospitals;
		switch (effectiveCoverageMode) {
			case COVERAGE_MODES.DEMO_ONLY:
				scoped = availableHospitals.filter((h) => demoEcosystemService.isDemoHospital(h));
				break;
			case COVERAGE_MODES.LIVE_ONLY:
				scoped = availableHospitals.filter((h) => !demoEcosystemService.isDemoHospital(h));
				break;
			default:
				break;
		}
		return coverageModeService.sortHospitalsForMapExperience(scoped);
	}, [availableHospitals, effectiveCoverageMode]);

	const filteredHospitals = useMemo(() => {
		if (!visibleHospitals || visibleHospitals.length === 0) return [];
		return visibleHospitals.filter((hospital) => {
			if (!hospital) return false;
			if (mode === EmergencyMode.EMERGENCY) {
				if (!serviceType || serviceType === "null" || serviceType === null) return true;
				const type = typeof serviceType === "string" ? serviceType.toLowerCase() : "";
				const hasServiceType = (hospital.serviceTypes || []).some((t) => t.toLowerCase() === type);
				const matchesTypeProp = (hospital.type || "").toLowerCase() === type;
				return hasServiceType || matchesTypeProp;
			} else {
				if (!selectedSpecialty) return true;
				return (hospital.specialties || []).some(
					(s) => s && typeof s === "string" && s.toLowerCase() === selectedSpecialty.toLowerCase()
				);
			}
		});
	}, [visibleHospitals, mode, serviceType, selectedSpecialty]);

	const specialties = useMemo(() => {
		const derived = new Set();
		availableHospitals.forEach((h) => {
			if (!Array.isArray(h?.specialties)) return;
			h.specialties.forEach((s) => { if (typeof s === "string" && s.trim()) derived.add(s); });
		});
		return derived.size > 0 ? Array.from(derived).sort() : SPECIALTIES;
	}, [availableHospitals]);

	const selectedHospital = useMemo(
		() => visibleHospitals.find((item) => item.id === selectedHospitalId) || null,
		[selectedHospitalId, visibleHospitals]
	);

	// Guard: clear selection if selected hospital is no longer visible
	useEffect(() => {
		if (!selectedHospitalId) return;
		if (visibleHospitals.some((h) => h?.id === selectedHospitalId)) return;
		setSelectedHospitalId(null);
	}, [selectedHospitalId, visibleHospitals, setSelectedHospitalId]);

	// Demo hospital for active ambulance trip
	const getActiveAmbulanceDemoHospital = useCallback((activeAmbulanceTrip) => {
		if (!activeAmbulanceTrip?.hospitalId) return null;
		const hospital = availableHospitals.find((item) => item?.id === activeAmbulanceTrip.hospitalId) ?? null;
		return demoEcosystemService.isDemoFlowActive({ hospital, demoModeEnabled: effectiveDemoModeEnabled })
			? hospital
			: null;
	}, [availableHospitals, effectiveDemoModeEnabled]);

	return {
		hospitals,
		filteredHospitals,
		visibleHospitals,
		availableHospitals,
		specialties,
		selectedHospital,
		isLoadingHospitals,
		activeAmbulances,
		refetchHospitals,
		updateHospitals,
		refreshHospitals,
		getActiveAmbulanceDemoHospital,
	};
}
