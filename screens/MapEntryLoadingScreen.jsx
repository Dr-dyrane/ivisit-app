// @deprecated Phase 7a — MapEntryLoadingScreen is superseded by MapExploreLoadingOverlay inside MapScreen.
// Confirm router entry before deleting. Recovery: git checkout HEAD -- screens/MapEntryLoadingScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import MapExploreLoadingOverlay from "../components/map/surfaces/MapExploreLoadingOverlay";
import { MAP_SHEET_SNAP_STATES } from "../components/map/core/MapSheetOrchestrator";
import { useTheme } from "../contexts/ThemeContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useGlobalLocation } from "../contexts/GlobalLocationContext";
import { useEmergency } from "../contexts/EmergencyContext";
import { useAuth } from "../contexts/AuthContext";
import { demoEcosystemService } from "../services/demoEcosystemService";

const MIN_ENTRY_LOADING_MS = 320;

function buildDemoBootstrapKey(location, userId) {
	return [
		Number(location?.latitude).toFixed(3),
		Number(location?.longitude).toFixed(3),
		userId || "guest",
	].join(":");
}

export default function MapEntryLoadingScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { height } = useAuthViewport();
	const { resetHeader } = useScrollAwareHeader();
	const { setHeaderState } = useHeaderState();
	const { user } = useAuth();
	const {
		userLocation: globalUserLocation,
		isLoadingLocation,
	} = useGlobalLocation();
	const {
		hospitals,
		allHospitals,
		setUserLocation,
		userLocation: emergencyUserLocation,
		isLoadingHospitals,
		refreshHospitals,
		effectiveDemoModeEnabled,
		coverageModePreferenceLoaded,
	} = useEmergency();

	const [hasAttemptedHospitalLoad, setHasAttemptedHospitalLoad] = useState(false);
	const [isBootstrappingDemo, setIsBootstrappingDemo] = useState(false);
	const entryStartedAtRef = useRef(Date.now());
	const hasNavigatedRef = useRef(false);
	const hasRequestedRefreshRef = useRef(false);
	const demoBootstrapKeyRef = useRef(null);

	const discoveredHospitals = useMemo(() => {
		if (Array.isArray(allHospitals) && allHospitals.length > 0) {
			return allHospitals;
		}
		return Array.isArray(hospitals) ? hospitals : [];
	}, [allHospitals, hospitals]);

	const activeLocation = emergencyUserLocation || globalUserLocation || null;
	const hasLocation = Boolean(activeLocation?.latitude && activeLocation?.longitude);

	useFocusEffect(
		React.useCallback(() => {
			resetHeader();
			setHeaderState({ hidden: true });
		}, [resetHeader, setHeaderState]),
	);

	useEffect(() => {
		if (!globalUserLocation?.latitude || !globalUserLocation?.longitude) {
			return;
		}

		setUserLocation((current) => {
			const sameCoordinate =
				Number(current?.latitude) === Number(globalUserLocation.latitude) &&
				Number(current?.longitude) === Number(globalUserLocation.longitude);

			if (sameCoordinate) {
				return current;
			}

			return {
				latitude: Number(globalUserLocation.latitude),
				longitude: Number(globalUserLocation.longitude),
				latitudeDelta: Number(current?.latitudeDelta) || 0.04,
				longitudeDelta: Number(current?.longitudeDelta) || 0.04,
			};
		});
	}, [globalUserLocation?.latitude, globalUserLocation?.longitude, setUserLocation]);

	useEffect(() => {
		let cancelled = false;

		if (!hasLocation || !coverageModePreferenceLoaded) {
			return undefined;
		}
		if (Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0) {
			setHasAttemptedHospitalLoad(true);
			return undefined;
		}
		if (isLoadingHospitals || hasRequestedRefreshRef.current) {
			return undefined;
		}

		hasRequestedRefreshRef.current = true;

		(async () => {
			try {
				await refreshHospitals?.();
			} finally {
				if (!cancelled) {
					setHasAttemptedHospitalLoad(true);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		coverageModePreferenceLoaded,
		discoveredHospitals,
		hasLocation,
		isLoadingHospitals,
		refreshHospitals,
	]);

	useEffect(() => {
		let cancelled = false;

		if (!coverageModePreferenceLoaded || !effectiveDemoModeEnabled) {
			return undefined;
		}
		if (!hasLocation || !hasAttemptedHospitalLoad) {
			return undefined;
		}
		if (isLoadingHospitals || isBootstrappingDemo) {
			return undefined;
		}
		if (Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0) {
			return undefined;
		}

		const bootstrapKey = buildDemoBootstrapKey(activeLocation, user?.id);
		if (demoBootstrapKeyRef.current === bootstrapKey) {
			return undefined;
		}

		demoBootstrapKeyRef.current = bootstrapKey;
		setIsBootstrappingDemo(true);

		(async () => {
			try {
				const provisioningUserId = await demoEcosystemService.getProvisioningUserId(user?.id);
				await demoEcosystemService.ensureDemoEcosystemForLocation({
					userId: provisioningUserId,
					latitude: activeLocation.latitude,
					longitude: activeLocation.longitude,
					radiusKm: 50,
				});
				await refreshHospitals?.();
			} catch (error) {
				console.warn("[MapEntryLoading] Demo bootstrap skipped", error);
			} finally {
				if (!cancelled) {
					setIsBootstrappingDemo(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		activeLocation,
		coverageModePreferenceLoaded,
		discoveredHospitals,
		effectiveDemoModeEnabled,
		hasAttemptedHospitalLoad,
		hasLocation,
		isBootstrappingDemo,
		isLoadingHospitals,
		refreshHospitals,
		user?.id,
	]);

	const coreDataResolved = useMemo(() => {
		if (!coverageModePreferenceLoaded || !hasLocation || isLoadingLocation) {
			return false;
		}
		if (Array.isArray(discoveredHospitals) && discoveredHospitals.length > 0) {
			return true;
		}
		if (isLoadingHospitals || isBootstrappingDemo) {
			return false;
		}
		if (!hasAttemptedHospitalLoad) {
			return false;
		}
		if (!effectiveDemoModeEnabled) {
			return true;
		}
		return Boolean(demoBootstrapKeyRef.current);
	}, [
		coverageModePreferenceLoaded,
		discoveredHospitals,
		effectiveDemoModeEnabled,
		hasAttemptedHospitalLoad,
		hasLocation,
		isBootstrappingDemo,
		isLoadingHospitals,
		isLoadingLocation,
	]);

	useEffect(() => {
		if (!coreDataResolved || hasNavigatedRef.current) {
			return undefined;
		}

		hasNavigatedRef.current = true;
		const elapsed = Date.now() - entryStartedAtRef.current;
		const delay = Math.max(0, MIN_ENTRY_LOADING_MS - elapsed);

		const timer = setTimeout(() => {
			router.replace("/(auth)/map");
		}, delay);

		return () => clearTimeout(timer);
	}, [coreDataResolved, router]);

	return (
		<View style={[styles.screen, { backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" }]}>
			<MapExploreLoadingOverlay
				screenHeight={height}
				snapState={MAP_SHEET_SNAP_STATES.HALF}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
});
