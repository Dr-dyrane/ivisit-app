"use client";

import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useFABActions } from "../contexts/FABContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useEmergency } from "../contexts/EmergencyContext";
import { useAuth } from "../contexts/AuthContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../hooks/user/useMedicalProfile";
import { useEmergencyRequests } from "../hooks/emergency/useEmergencyRequests";
import { useVisits } from "../contexts/VisitsContext";
import { useRequestFlow } from "../hooks/emergency/useRequestFlow";
import useAuthViewport from "../hooks/ui/useAuthViewport";
import EmergencyRequestModal from "../components/emergency/EmergencyRequestModal";
import EmergencyIntakeOrchestrator from "../components/emergency/intake/EmergencyIntakeOrchestrator";
import { navigateBack, ROUTES } from "../utils/navigationHelpers";
import { triageService } from "../services/triageService";
import { demoEcosystemService } from "../services/demoEcosystemService";

const MIN_FINDING_NEARBY_HELP_MS = 1600;
const EMERGENCY_INTAKE_PHASE_STORAGE_VERSION = 1;

const buildEmergencyIntakePhaseStorageKey = (userId) =>
	`@ivisit/emergency_intake_phase/v${EMERGENCY_INTAKE_PHASE_STORAGE_VERSION}:${userId || "guest"}`;

const normalizeLocationCoordinate = (location) => {
	const latitude = Number(location?.latitude);
	const longitude = Number(location?.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return { latitude, longitude };
};

const hasHospitalCoordinates = (hospital) =>
	Number.isFinite(Number(hospital?.coordinates?.latitude ?? hospital?.latitude)) &&
	Number.isFinite(Number(hospital?.coordinates?.longitude ?? hospital?.longitude));

const hasHospitalDistance = (hospital) =>
	(typeof hospital?.distance === "string" && hospital.distance.trim().length > 0) ||
	Number.isFinite(Number(hospital?.distanceKm));

const hasHospitalEta = (hospital) =>
	(typeof hospital?.eta === "string" && hospital.eta.trim().length > 0) ||
	(typeof hospital?.estimatedArrival === "string" &&
		hospital.estimatedArrival.trim().length > 0) ||
	Number.isFinite(Number(hospital?.etaSeconds));

const hasHospitalAmbulanceCoverage = (hospital) =>
	Number(hospital?.ambulances ?? 0) > 0 ||
	Object.keys(hospital?.ambulanceAvailability || {}).length > 0 ||
	(Array.isArray(hospital?.serviceTypes) && hospital.serviceTypes.length > 0);

const hasHospitalOrganization = (hospital) =>
	(typeof hospital?.organization_id === "string" &&
		hospital.organization_id.trim().length > 0) ||
	(typeof hospital?.organizationId === "string" &&
		hospital.organizationId.trim().length > 0);

const isHospitalExperienceComplete = (hospital) =>
	Boolean(
		hospital?.id &&
			hospital?.name &&
			hasHospitalCoordinates(hospital) &&
			hasHospitalDistance(hospital) &&
			hasHospitalEta(hospital) &&
			hasHospitalAmbulanceCoverage(hospital) &&
			hasHospitalOrganization(hospital),
	);

export default function RequestAmbulanceScreen() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;
	const params = useLocalSearchParams();
	const hospitalId = typeof params?.hospitalId === "string" ? params.hospitalId : null;
	const [showLegacyFlow, setShowLegacyFlow] = useState(false);
	const [intakeDraft, setIntakeDraft] = useState(null);
	const [persistedIntakeViewState, setPersistedIntakeViewState] = useState(null);
	const [intakePersistenceReady, setIntakePersistenceReady] = useState(false);
	const findingStartedAtRef = useRef(0);
	const intakeBackActionRef = useRef(null);
	const persistTimerRef = useRef(null);
	const persistHashRef = useRef("");
	const demoBootstrapKeyRef = useRef("");
	const demoBootstrapInFlightRef = useRef(false);
	const [intakeHeaderState, setIntakeHeaderState] = useState({
		title: "Where are you?",
		subtitle: "CHOOSE LOCATION",
	});
	const [intakeBackMode, setIntakeBackMode] = useState("exit");

	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
	const { resetHeader } = useScrollAwareHeader();

	const { user } = useAuth();
	const { preferences } = usePreferences();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const { createRequest, updateRequest, updateTriage, setRequestStatus } = useEmergencyRequests();
	const { addVisit, updateVisit } = useVisits();

	const { registerFAB, unregisterFAB } = useFABActions();
	const {
		hospitals,
		selectedHospital,
		selectedSpecialty,
		activeAmbulanceTrip,
		ambulanceTelemetryHealth,
		activeBedBooking,
		startAmbulanceTrip,
		startBedBooking,
		selectHospital,
		clearSelectedHospital,
		setMode,
		setCoverageMode,
		refreshHospitals,
		setUserLocation,
		isLoadingHospitals,
		coverageStatus,
		coverageModeOperation,
		effectiveDemoModeEnabled,
	} = useEmergency();

	const requestHospital = useMemo(() => {
		if (!hospitalId) return selectedHospital;
		return hospitals.find((h) => h?.id === hospitalId) ?? selectedHospital;
	}, [hospitalId, hospitals, selectedHospital]);
	const intakeRequestHospital = intakeDraft?.hospital ?? null;
	const resolvedRequestHospital = intakeRequestHospital ?? requestHospital;
	const activeIntakeLocation = useMemo(
		() =>
			normalizeLocationCoordinate(
				persistedIntakeViewState?.selectedLocation?.location || intakeDraft?.location || null,
			),
		[persistedIntakeViewState?.selectedLocation?.location, intakeDraft?.location],
	);
	const matchedTripState = useMemo(
		() => (activeAmbulanceTrip?.requestId ? activeAmbulanceTrip : null),
		[activeAmbulanceTrip],
	);
	const showResponsiveIntakeBase = !showLegacyFlow || !!matchedTripState;
	const hospitalRecommendation = useMemo(() => {
		const completeHospitals = hospitals.filter((hospital) =>
			isHospitalExperienceComplete(hospital),
		);
		const incompleteHospitals = hospitals.filter(
			(hospital) => !isHospitalExperienceComplete(hospital),
		);
		const recommendationPool =
			completeHospitals.length > 0 ? completeHospitals : hospitals;
		const alternativePool =
			completeHospitals.length > 0
				? [...completeHospitals, ...incompleteHospitals]
				: hospitals;

		if (
			requestHospital?.id &&
			(completeHospitals.length === 0 || isHospitalExperienceComplete(requestHospital))
		) {
			return {
				recommendedHospital: requestHospital,
				alternativeHospitals: [
					requestHospital,
					...alternativePool.filter((item) => item?.id !== requestHospital.id),
				],
			};
		}

		const snapshot = triageService.buildTriageSnapshot({
			stage: "intake_review",
			request: {
				serviceType: "ambulance",
				specialty: selectedSpecialty ?? null,
			},
			hospitals: recommendationPool,
			selectedHospitalId: selectedHospital?.id ?? null,
			medicalProfile,
			emergencyContacts,
			userCheckin: null,
			currentRoute: null,
		});

		const recommendedHospitalId = snapshot?.suitability?.recommendedHospitalId ?? null;
		const recommendedHospital =
			recommendationPool.find((item) => item?.id === recommendedHospitalId) ??
			recommendationPool.find((item) => item?.id === selectedHospital?.id) ??
			recommendationPool[0] ??
			null;
		const alternativeHospitals = recommendedHospital?.id
			? [
				recommendedHospital,
				...alternativePool.filter(
					(item) => item?.id && item.id !== recommendedHospital.id,
				),
			]
			: alternativePool;

		return {
			recommendedHospital,
			alternativeHospitals,
		};
	}, [
		emergencyContacts,
		hospitals,
		medicalProfile,
		requestHospital,
		selectedHospital,
		selectedSpecialty,
	]);
	const completeHospitalCount = useMemo(
		() =>
			hospitalRecommendation.alternativeHospitals.filter((hospital) =>
				isHospitalExperienceComplete(hospital),
			).length,
		[hospitalRecommendation.alternativeHospitals],
	);
	const recommendedHospitalIsComplete = isHospitalExperienceComplete(
		hospitalRecommendation.recommendedHospital,
	);
	const hospitalChoiceState = useMemo(() => {
		const totalOptions = hospitalRecommendation.alternativeHospitals.length;
		const verifiedOptions = completeHospitalCount;
		const isRefreshingCatalog = Boolean(
			isLoadingHospitals || coverageModeOperation?.isPending,
		);
		const hasOptions = totalOptions > 0;
		const status = !hasOptions && isRefreshingCatalog
			? "loading"
			: hasOptions
				? "ready"
				: "empty";
		const optionLabel = totalOptions === 1 ? "hospital" : "hospitals";
		const verifiedLabel = verifiedOptions === 1 ? "option" : "options";

		let message = "";
		if (status === "loading") {
			message = "Checking nearby hospitals and route availability for this location.";
		} else if (status === "empty") {
			message = "No nearby hospitals are ready yet. Change the location or refresh options.";
		} else if (isRefreshingCatalog) {
			message = `Refreshing nearby hospitals. ${totalOptions} ${optionLabel} ready to review.`;
		} else if (verifiedOptions > 0 && verifiedOptions < totalOptions) {
			message = `${verifiedOptions} verified ${verifiedLabel} ready now. More nearby hospitals are still syncing.`;
		} else if (totalOptions > 0) {
			message = `${totalOptions} nearby ${optionLabel} ready to review.`;
		}

		return {
			status,
			message,
			totalOptions,
			verifiedOptions,
			isRefreshingCatalog: hasOptions && isRefreshingCatalog,
		};
	}, [
		completeHospitalCount,
		coverageModeOperation?.isPending,
		hospitalRecommendation.alternativeHospitals.length,
		isLoadingHospitals,
	]);
	const shouldBackfillDemoExperience = Boolean(
		activeIntakeLocation &&
			!matchedTripState &&
			(!recommendedHospitalIsComplete || completeHospitalCount < 3),
	);
	const shouldForceDemoBootstrap = Boolean(
		activeIntakeLocation &&
			!matchedTripState &&
			completeHospitalCount === 0,
	);
	const intakePhaseStorageKey = useMemo(
		() => buildEmergencyIntakePhaseStorageKey(user?.id),
		[user?.id],
	);

	const { handleRequestInitiated, handleRequestComplete } = useRequestFlow({
		createRequest,
		updateRequest,
		updateTriage,
		addVisit,
		updateVisit,
		setRequestStatus,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		user,
		preferences,
		medicalProfile,
		emergencyContacts,
		hospitals,
		selectedSpecialty,
		requestHospitalId: hospitalId,
		selectedHospital,
		activeAmbulanceTrip,
		activeBedBooking,
		currentRoute: null,
		effectiveDemoModeEnabled,
		onRequestComplete: () => { },
	});

	const clearPersistedIntakePhase = useCallback(() => {
		persistHashRef.current = "";
		if (persistTimerRef.current) {
			clearTimeout(persistTimerRef.current);
			persistTimerRef.current = null;
		}
		return AsyncStorage.removeItem(intakePhaseStorageKey).catch(() => {});
	}, [intakePhaseStorageKey]);

	const handleClose = useCallback(() => {
		if (__DEV__) {
			console.log("[EmergencyTrace][RequestAmbulanceScreen] handleClose -> leaving emergency stack");
		}
		void clearPersistedIntakePhase();
		navigateBack({ router, fallbackRoute: ROUTES.TABS_ROOT });
	}, [clearPersistedIntakePhase, router]);

	const returnToLastIntakePhase = useCallback(() => {
		if (__DEV__) {
			console.log("[EmergencyTrace][RequestAmbulanceScreen] returning to last intake phase", {
				showLegacyFlow,
				hasMatchedTrip: Boolean(matchedTripState),
				hasIntakeDraft: Boolean(intakeDraft),
				hasPersistedSnapshot: Boolean(persistedIntakeViewState),
			});
		}
		setShowLegacyFlow(false);
	}, [showLegacyFlow, matchedTripState, intakeDraft, persistedIntakeViewState]);

	const handleLegacyFlowClose = useCallback(() => {
		if (!matchedTripState) {
			returnToLastIntakePhase();
			return;
		}

		handleClose();
	}, [handleClose, matchedTripState, returnToLastIntakePhase]);

	const handleIntakeBackChange = useCallback((nextState) => {
		intakeBackActionRef.current =
			typeof nextState?.handler === "function" ? nextState.handler : null;
		setIntakeBackMode(nextState?.mode === "phase" ? "phase" : "exit");
	}, []);

	const handleHeaderBack = useCallback(() => {
		if (
			showResponsiveIntakeBase &&
			intakeBackMode === "phase" &&
			typeof intakeBackActionRef.current === "function"
		) {
			if (__DEV__) {
				console.log("[EmergencyTrace][RequestAmbulanceScreen] header back -> intake phase handler");
			}
			intakeBackActionRef.current();
			return;
		}

		if (!showResponsiveIntakeBase && !matchedTripState) {
			if (__DEV__) {
				console.log("[EmergencyTrace][RequestAmbulanceScreen] header back -> return to proposed hospital");
			}
			returnToLastIntakePhase();
			return;
		}

		handleClose();
	}, [handleClose, intakeBackMode, matchedTripState, returnToLastIntakePhase, showResponsiveIntakeBase]);

	const backButton = useCallback(
		() => <HeaderBackButton onPress={handleHeaderBack} />,
		[handleHeaderBack],
	);

	useEffect(() => {
		if (__DEV__) {
			console.log("[EmergencyTrace][RequestAmbulanceScreen] render state", {
				showLegacyFlow,
				showResponsiveIntakeBase,
				hasMatchedTrip: Boolean(matchedTripState),
				hospital: resolvedRequestHospital?.name || null,
			});
		}
	}, [matchedTripState, resolvedRequestHospital?.name, showLegacyFlow, showResponsiveIntakeBase]);

	useFocusEffect(
		useCallback(() => {
			// 🔓 UNIFIED UI UNLOCK: Force header and tab bar into view on navigation
			// This prevents the "missing header" glitch when navigating from scrolled views
			resetTabBar();
			resetHeader();

			setHeaderState({
				title: showResponsiveIntakeBase
					? intakeHeaderState.title
					: resolvedRequestHospital?.name || "Medical Center",
				subtitle: showResponsiveIntakeBase
					? intakeHeaderState.subtitle
					: "",
				icon: <Ionicons name="medical" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.emergency,
				leftComponent: backButton(),
				rightComponent: false,
				hidden: false,
				scrollAware: false,
			});

			setMode("emergency");
			}, [
			backButton,
			intakeHeaderState.subtitle,
			intakeHeaderState.title,
			showResponsiveIntakeBase,
			requestHospital?.name,
			resolvedRequestHospital?.name,
			resetHeader,
			resetTabBar,
			setHeaderState,
			setMode,
		])
	);

	useEffect(() => {
		let cancelled = false;

		const hydrateIntakePhase = async () => {
			try {
				const storedRaw = await AsyncStorage.getItem(intakePhaseStorageKey);
				if (!storedRaw || cancelled) {
					return;
				}

				const parsed = JSON.parse(storedRaw);
				if (!parsed || typeof parsed !== "object") {
					return;
				}

				setShowLegacyFlow(parsed.showLegacyFlow === true);
				setIntakeDraft(parsed.intakeDraft && typeof parsed.intakeDraft === "object" ? parsed.intakeDraft : null);
				setPersistedIntakeViewState(
					parsed.intakeViewState && typeof parsed.intakeViewState === "object"
						? parsed.intakeViewState
						: null,
				);
				setIntakeHeaderState(
					parsed.intakeHeaderState &&
						typeof parsed.intakeHeaderState.title === "string" &&
						typeof parsed.intakeHeaderState.subtitle === "string"
						? parsed.intakeHeaderState
						: {
							title: "Where are you?",
							subtitle: "CHOOSE LOCATION",
						},
				);
				setIntakeBackMode(parsed.intakeBackMode === "phase" ? "phase" : "exit");
				findingStartedAtRef.current = Number.isFinite(Number(parsed.findingStartedAt))
					? Number(parsed.findingStartedAt)
					: 0;
			} catch (error) {
				if (__DEV__) {
					console.warn("[RequestAmbulanceScreen] Failed to restore intake phase:", error);
				}
			} finally {
				if (!cancelled) {
					setIntakePersistenceReady(true);
				}
			}
		};

		void hydrateIntakePhase();

		return () => {
			cancelled = true;
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
			}
		};
	}, [intakePhaseStorageKey]);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				tension: 50,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	useEffect(() => {
		if (!intakePersistenceReady) return;

		const hasMeaningfulPhaseState = Boolean(
			showLegacyFlow || intakeDraft || persistedIntakeViewState,
		);

		if (!hasMeaningfulPhaseState) {
			if (persistHashRef.current) {
				void clearPersistedIntakePhase();
			}
			return;
		}

		const snapshot = {
			version: EMERGENCY_INTAKE_PHASE_STORAGE_VERSION,
			showLegacyFlow,
			intakeDraft,
			intakeHeaderState,
			intakeBackMode,
			intakeViewState: persistedIntakeViewState,
			findingStartedAt: findingStartedAtRef.current || 0,
		};

		const nextHash = JSON.stringify(snapshot);
		if (persistHashRef.current === nextHash) return;
		persistHashRef.current = nextHash;

		if (persistTimerRef.current) {
			clearTimeout(persistTimerRef.current);
		}

		persistTimerRef.current = setTimeout(() => {
			AsyncStorage.setItem(intakePhaseStorageKey, nextHash).catch((error) => {
				if (__DEV__) {
					console.warn("[RequestAmbulanceScreen] Failed to persist intake phase:", error);
				}
			});
		}, 180);

		return () => {
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
			}
		};
	}, [
		clearPersistedIntakePhase,
		intakeBackMode,
		intakeDraft,
		intakeHeaderState,
		intakePersistenceReady,
		intakePhaseStorageKey,
		persistedIntakeViewState,
		showLegacyFlow,
	]);

	useEffect(() => {
		if (!activeIntakeLocation) return;

		setUserLocation((current) => {
			const currentLatitude = Number(current?.latitude);
			const currentLongitude = Number(current?.longitude);
			const sameCoordinate =
				Number.isFinite(currentLatitude) &&
				Number.isFinite(currentLongitude) &&
				Math.abs(currentLatitude - activeIntakeLocation.latitude) < 0.0001 &&
				Math.abs(currentLongitude - activeIntakeLocation.longitude) < 0.0001;

			if (sameCoordinate) {
				return current;
			}

			return {
				latitude: activeIntakeLocation.latitude,
				longitude: activeIntakeLocation.longitude,
				latitudeDelta: Number(current?.latitudeDelta) || 0.04,
				longitudeDelta: Number(current?.longitudeDelta) || 0.04,
			};
		});
	}, [activeIntakeLocation, setUserLocation]);

	useEffect(() => {
		if (!showResponsiveIntakeBase || !shouldBackfillDemoExperience || !activeIntakeLocation) {
			return;
		}
		if (coverageModeOperation?.isPending || demoBootstrapInFlightRef.current) {
			return;
		}

		const bootstrapKey = [
			activeIntakeLocation.latitude.toFixed(4),
			activeIntakeLocation.longitude.toFixed(4),
			coverageStatus,
			effectiveDemoModeEnabled ? "demo" : "live",
		].join(":");
		if (demoBootstrapKeyRef.current === bootstrapKey) {
			return;
		}

		demoBootstrapKeyRef.current = bootstrapKey;
		demoBootstrapInFlightRef.current = true;
		let cancelled = false;

		const ensureCompleteDemoExperience = async () => {
			try {
				const bootstrapResult = await demoEcosystemService.ensureDemoEcosystemForLocation({
					userId: user?.id || "guest",
					latitude: activeIntakeLocation.latitude,
					longitude: activeIntakeLocation.longitude,
					radiusKm: 50,
					force: shouldForceDemoBootstrap,
				});

				if (cancelled) return;

				if (!effectiveDemoModeEnabled) {
					await setCoverageMode?.("hybrid");
				} else if (bootstrapResult?.bootstrapped) {
					await refreshHospitals?.();
				}
			} catch (error) {
				if (__DEV__) {
					console.warn("[RequestAmbulanceScreen] Demo backfill failed:", error);
				}
			} finally {
				demoBootstrapInFlightRef.current = false;
			}
		};

		void ensureCompleteDemoExperience();

		return () => {
			cancelled = true;
		};
	}, [
		activeIntakeLocation,
		coverageModeOperation?.isPending,
		coverageStatus,
		effectiveDemoModeEnabled,
		refreshHospitals,
		setCoverageMode,
		showResponsiveIntakeBase,
		shouldBackfillDemoExperience,
		shouldForceDemoBootstrap,
		user?.id,
	]);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			// Keep request-flow header always visible while user scrolls form content.
		},
		[handleTabBarScroll]
	);

	const delay = useCallback((ms) => new Promise((resolve) => setTimeout(resolve, ms)), []);

	const handleDispatched = useCallback(
		async (payload) => {
			const minMs = 800;
			const startedAt = Date.now();
			await handleRequestComplete(payload);
			const elapsed = Date.now() - startedAt;
			if (elapsed < minMs) {
				await delay(minMs - elapsed);
			}
			await clearPersistedIntakePhase();
			navigateBack({ router, fallbackRoute: "/(auth)" });
		},
		[clearPersistedIntakePhase, delay, handleRequestComplete, router]
	);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	if (!intakePersistenceReady) {
		return <LinearGradient colors={backgroundColors} style={styles.container} />;
	}

	return (
		<LinearGradient colors={backgroundColors} style={styles.container}>
			<Animated.View
				style={{
					flex: 1,
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				<View style={{ flex: 1 }}>
					{showResponsiveIntakeBase ? (
						<EmergencyIntakeOrchestrator
							onContinue={(payload) => {
								if (payload?.hospital?.id) {
									selectHospital(payload.hospital.id);
								}
								setIntakeDraft(payload || null);
								findingStartedAtRef.current = Date.now();
								setShowLegacyFlow(true);
							}}
							initialSnapshot={persistedIntakeViewState}
							onStateSnapshotChange={setPersistedIntakeViewState}
							onHeaderStateChange={setIntakeHeaderState}
							onBackNavigationChange={handleIntakeBackChange}
							headerOffset={topPadding}
							matchedTrip={matchedTripState}
							ambulanceTelemetryHealth={ambulanceTelemetryHealth}
							recommendedHospital={hospitalRecommendation.recommendedHospital}
							alternativeHospitals={hospitalRecommendation.alternativeHospitals}
							hospitalChoiceState={hospitalChoiceState}
							onRefreshHospitalOptions={refreshHospitals}
						/>
					) : (
						<EmergencyRequestModal
							mode="emergency"
							requestHospital={resolvedRequestHospital}
							selectedSpecialty={selectedSpecialty}
							onRequestClose={handleLegacyFlowClose}
							onRequestInitiated={handleRequestInitiated}
							onRequestComplete={handleDispatched}
							intakeDraft={intakeDraft}
							showClose={false}
							onScroll={handleScroll}
							scrollContentStyle={{
								paddingHorizontal: 12,
								paddingTop: topPadding,
								paddingBottom: bottomPadding,
							}}
						/>
					)}
				</View>
			</Animated.View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
