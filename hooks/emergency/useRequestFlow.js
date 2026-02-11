import { useCallback, useRef, useMemo, useEffect } from "react";
import * as Location from "expo-location";
import { DispatchService } from "../../services/dispatchService";
import { useRequestInitiation } from "./flow/useRequestInitiation";
import { useRequestCompletion } from "./flow/useRequestCompletion";

/**
 * 💡 STABILITY NOTE:
 * This hook uses a "Latest Props Ref" pattern (ref-guarded props) to ensure that the returned 
 * action handlers (handleRequestInitiated, handleRequestComplete) are perfectly stable (referentially).
 * 
 * WHY: This prevents infinite re-render loops in components like EmergencyRequestModal that 
 * register effects based on these handlers. Even if the parent passes anonymous functions 
 * as props, this hook won't re-create its internal stability-critical callbacks.
 */
export const useRequestFlow = (props) => {
	const propsRef = useRef(props);
	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	const inflightByTypeRef = useRef({ ambulance: false, bed: false });

	const blockResult = useCallback((reason, extra) => {
		return { ok: false, reason, ...extra };
	}, []);

	const successResult = useCallback((reason, extra) => {
		return { ok: true, reason, ...extra };
	}, []);

	const canStartRequest = useCallback(
		(serviceType) => {
			const { activeAmbulanceTrip, activeBedBooking } = propsRef.current;
			if (serviceType === "ambulance") return !activeAmbulanceTrip?.requestId;
			if (serviceType === "bed") return !activeBedBooking?.requestId;
			return false;
		},
		[]
	);

    // --- Sub-Hooks ---

    const { handleRequestInitiated } = useRequestInitiation({
        propsRef,
        inflightByTypeRef,
        blockResult,
        canStartRequest
    });

    const { handleRequestComplete } = useRequestCompletion({
        propsRef,
        inflightByTypeRef,
        blockResult,
        canStartRequest
    });

	// 🚨 QUICK EMERGENCY: Auto-dispatch without hospital selection
	const handleQuickEmergency = useCallback(async (serviceType = "ambulance") => {
		const { hospitals } = propsRef.current;

		if (!canStartRequest(serviceType)) {
			return blockResult("ALREADY_ACTIVE", { serviceType });
		}

		if (inflightByTypeRef.current[serviceType] === true) {
			return blockResult("IN_FLIGHT", { serviceType });
		}

		inflightByTypeRef.current[serviceType] = true;

		try {
			// Get user location first
			let userLocation = null;
			try {
				const currentLocation = await Location.getCurrentPositionAsync({});
				userLocation = {
					latitude: currentLocation.coords.latitude,
					longitude: currentLocation.coords.longitude
				};
			} catch (locationError) {
				console.warn('[useRequestFlow] Quick emergency location failed:', locationError);
				return blockResult("LOCATION_ERROR", { serviceType });
			}

			// Auto-select best hospital
			const bestHospital = DispatchService.selectBestHospital(hospitals || [], userLocation);
			if (!bestHospital) {
				return blockResult("NO_HOSPITALS", { serviceType });
			}

			// Create visitId for the request
			const visitId = `quick_${Date.now()}`;

			// Create emergency request with auto-selected hospital
			const result = await handleRequestInitiated({
				serviceType,
				hospitalId: bestHospital.id,
				requestId: visitId,
				autoDispatched: true,
				dispatchScore: bestHospital.dispatchScore
			});

			return successResult("REQUEST_CREATED", {
				requestId: result.requestId || visitId,
				hospital: bestHospital.name,
				hospitalId: bestHospital.id,
				autoDispatched: true,
				dispatchScore: bestHospital.dispatchScore
			});

		} catch (error) {
			console.error('[useRequestFlow] Quick emergency failed:', error);
			return blockResult("REQUEST_FAILED", { serviceType, error: error.message });
		} finally {
			inflightByTypeRef.current[serviceType] = false;
		}
	}, [blockResult, canStartRequest, handleRequestInitiated, successResult]);

	return useMemo(() => ({
		handleRequestInitiated,
		handleRequestComplete,
		handleQuickEmergency
	}), [handleRequestInitiated, handleRequestComplete, handleQuickEmergency]);
};
