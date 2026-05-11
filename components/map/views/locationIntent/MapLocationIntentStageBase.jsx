import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import {
	GLASS_SURFACE_VARIANTS,
	getGlassSurfaceTokens,
} from "../../../../constants/surfaces";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapExploreIntentResponsiveMetrics from "../exploreIntent/useMapExploreIntentResponsiveMetrics";
import buildMapLocationIntentModel, {
	LOCATION_INTENT_MODES,
	MANUAL_LOCATION_STEPS,
} from "./mapLocationIntent.model";
import { mapSuggestionToLocation } from "../../surfaces/search/mapSearchSheet.helpers";
import buildLocationIntentThemeTokens from "./mapLocationIntent.theme";
import {
	buildManualAddressLabel,
	buildManualAddressParts,
	buildLocationIntentManagedSavedPlaces,
	buildLocationIntentRecents,
	buildLocationIntentSavedPlaces,
	getManualStepActionLabel,
	getSaveCategoryAction,
	getSavedLocationKey,
	mapStoredLocationToCandidate,
	validateManualLocationStep,
} from "./mapLocationIntent.helpers";
import addressAssistService from "../../../../services/addressAssistService";
import { mapCandidateToPickupPayload } from "../../../../services/locationAddressService";
import { useLocationStore, selectSavedLocations } from "../../../../stores/locationStore";
import {
	MapLocationIntentActiveTopRow,
	MapLocationIntentBodyContent,
	MapLocationIntentCollapsedTopRow,
} from "./MapLocationIntentStageParts";
import ManualStepStickyFooter from "./ManualStepStickyFooter";
import useAddressSearchController from "./useAddressSearchController";
import useLocationSheetNavigation from "./useLocationSheetNavigation";
import useAddressCandidateController from "../../../../hooks/map/locationIntent/useAddressCandidateController";
import useSavedAddressActions from "../../../../hooks/map/locationIntent/useSavedAddressActions";
import useManualDropController from "../../../../hooks/map/locationIntent/useManualDropController";
import styles from "./mapLocationIntent.styles";

export default function MapLocationIntentStageBase({
	sheetHeight,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	onClose,
	onUseCurrentLocation,
	onSelectLocation,
	onFindNearbyHospitals,
	onSnapStateChange,
	currentLocation,
	locationControl,
	sheetPayload,
}) {
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const glassTokens = useMemo(
		() =>
			getGlassSurfaceTokens({
				isDarkMode,
				variant: GLASS_SURFACE_VARIANTS.HEADER,
			}),
		[isDarkMode],
	);
	const themeTokens = useMemo(
		() => buildLocationIntentThemeTokens({ isDarkMode, tokens }),
		[isDarkMode, tokens],
	);
	const {
		isSidebarPresentation,
		contentMaxWidth,
		presentationMode,
		shellWidth,
		shouldUseWideStageInset,
	} = useMapStageSurfaceLayout();
	const responsiveMetrics = useMapExploreIntentResponsiveMetrics();
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const effectivePresentationMode = presentationMode;
	const topSlotContainerStyle = [
		sheetStageStyles.topSlotContained,
		presentationMode === "sheet" ? sheetStageStyles.topSlotSheet : null,
		presentationMode === "modal" ? sheetStageStyles.topSlotModal : null,
		isSidebarPresentation ? sheetStageStyles.topSlotSidebar : null,
		shouldUseWideStageInset ? sheetStageStyles.topSlotWide : null,
		modalContainedStyle,
	];
	const [manualStepIndex, setManualStepIndex] = useState(0);
	const [manualDraft, setManualDraft] = useState({
		country: "",
		countryCode: "",
		adminArea: "",
		city: "",
		districtArea: "",
		placeOrAddress: "",
		unit: "",
		responderNote: "",
	});
	const [manualError, setManualError] = useState(null);
	const [isResolvingManual, setIsResolvingManual] = useState(false);
	const savedLocations = useLocationStore(selectSavedLocations);
	const locationBias = useMemo(
		() => currentLocation?.location || currentLocation || null,
		[currentLocation],
	);

	// LS-1: candidate state owned by controller hook (atom-backed, survives snap collapse)
	const candidateController = useAddressCandidateController({
		manualDraft,
		locationControl,
	});
	const { candidate: selectedLocation, setActiveCandidate, buildCandidate: buildSelectedLocation, clearCandidate } = candidateController;

	// LS-2: CRUD state machine + save flow atoms owned by this hook
	const savedActions = useSavedAddressActions({
		savedLocations,
		candidate: selectedLocation,
	});
	const {
		pendingPlaceLabel,
		pendingSaveCategory,
		savedPlaceFeedback,
		isConfirmingSavedRemove,
		saveDetailsDraft,
		setPendingPlaceLabel,
		setPendingSaveCategory,
		setSavedPlaceFeedback,
		setIsConfirmingSavedRemove,
		setSaveDetailsDraft,
		resetSaveFlow,
		save: saveSelectedLocationAs,
		update: updateSavedEntry,
		remove: removeSavedEntry,
		markUsed: markSavedAsUsed,
	} = savedActions;

	// LS-3: manual drop search via TanStack query (no useEffect timer)
	const manualDropController = useManualDropController({
		manualStepIndex,
		manualDraft,
		locationBias,
	});
	const { manualDropQuery, manualDropResults, isSearchingManualDrop, manualDropContextHint, setManualDropQuery, clearManualDrop } = manualDropController;

	const resetTransientStateForDefault = useCallback(() => {
		setManualError(null);
		setManualStepIndex(0);
		resetSaveFlow();
		clearCandidate();
	}, [clearCandidate, resetSaveFlow]);

	const locationNavigation = useLocationSheetNavigation({
		onResetToDefault: resetTransientStateForDefault,
	});
	const {
		mode,
		isSearchMode,
		openAddressSearch: navigateToAddressSearch,
		openManualStep: navigateToManualStep,
		openConfirm: navigateToConfirm,
		openCandidateDecision: navigateToCandidateDecision,
		openSaveCategory: navigateToSaveCategory,
		openSaveDetails: navigateToSaveDetails,
		openSavedManage: navigateToSavedManage,
		openPlacesHub: navigateToPlacesHub,
		openRecentsHub: navigateToRecentsHub,
		replaceModeStack: replaceNavigationStack,
		returnToDefault: navigateToDefault,
		goBack: navigateBack,
		stack: navigationStack,
	} = locationNavigation;

	const openAddressSearch = useCallback(() => {
		setSavedPlaceFeedback(null);
		navigateToAddressSearch();
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [navigateToAddressSearch, onSnapStateChange, setSavedPlaceFeedback]);

	const openPlacesHub = useCallback(() => {
		navigateToPlacesHub();
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [navigateToPlacesHub, onSnapStateChange]);

	const openRecentsHub = useCallback(() => {
		navigateToRecentsHub();
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [navigateToRecentsHub, onSnapStateChange]);

	const {
		searchQuery,
		setSearchQuery,
		clearSearch,
		searchResults,
		isSearchingLocations,
		locationSearchError,
		setLocationSearchError,
		recentSearchQueries,
		commitSearchQuery,
	} = useAddressSearchController({
		isActive: isSearchMode,
		locationBias,
		onOpenSearch: openAddressSearch,
	});
	const navigateToDefaultAndClearSearch = useCallback(() => {
		clearSearch();
		navigateToDefault();
	}, [clearSearch, navigateToDefault]);
	const navigateBackWithinLocationLoop = useCallback(() => {
		if (navigationStack.length > 0) {
			navigateBack();
			return;
		}
		navigateToDefaultAndClearSearch();
	}, [navigateBack, navigateToDefaultAndClearSearch, navigationStack.length]);

	useEffect(() => {
		const seededQuery =
			typeof sheetPayload?.addressQuery === "string" ||
			typeof sheetPayload?.query === "string"
				? String(sheetPayload.addressQuery || sheetPayload.query).trim()
				: "";
		if (seededQuery) {
			setSearchQuery(seededQuery, { open: false });
			openAddressSearch();
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
		}
	}, [
		onSnapStateChange,
		openAddressSearch,
		sheetPayload?.addressQuery,
		sheetPayload?.query,
		setSearchQuery,
	]);

	const model = useMemo(
		() =>
			buildMapLocationIntentModel({
				currentLocation,
				locationControl,
				mode,
			}),
		[currentLocation, locationControl, mode],
	);

	const effectiveSnapState =
		effectivePresentationMode === "sheet"
			? snapState
			: MAP_SHEET_SNAP_STATES.EXPANDED;
	const shouldShowHeaderToggle = effectivePresentationMode === "sheet";
	const isCollapsed = effectiveSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isExpanded = effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;
	const allowedSnapStates = useMemo(
		() =>
			effectivePresentationMode === "sheet"
				? [
						MAP_SHEET_SNAP_STATES.COLLAPSED,
						MAP_SHEET_SNAP_STATES.HALF,
						MAP_SHEET_SNAP_STATES.EXPANDED,
					]
				: [MAP_SHEET_SNAP_STATES.EXPANDED],
		[effectivePresentationMode],
	);
	const heroSurfaceColor =
		isDarkMode
			? "rgba(255,255,255,0.075)"
			: "rgba(255,255,255,0.66)";
	const groupSurfaceColor =
		isDarkMode
			? "rgba(255,255,255,0.06)"
			: "rgba(255,255,255,0.78)";
	const infoSurfaceColor =
		Platform.OS === "android"
			? glassTokens.surfaceColor
			: isDarkMode
				? "rgba(255,255,255,0.06)"
				: "rgba(255,255,255,0.58)";
	const {
		allowScrollDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel,
		handleSnapToggle,
	} = useMapSheetDetents({
		sheetHeight,
		snapState: effectiveSnapState,
		presentationMode: effectivePresentationMode,
		allowedSnapStates,
		onSnapStateChange,
	});

	const {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState: effectiveSnapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});

	const handleHeaderToggle = useCallback(() => {
		if (!shouldShowHeaderToggle) return;
		if (effectiveSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}
		if (effectiveSnapState === MAP_SHEET_SNAP_STATES.HALF) {
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF);
	}, [effectiveSnapState, onSnapStateChange, shouldShowHeaderToggle]);

	const isCandidateDecisionMode =
		mode === LOCATION_INTENT_MODES.CANDIDATE_DECISION ||
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.PIN_ADJUST;
	const isNestedDecisionMode =
		mode === LOCATION_INTENT_MODES.SAVE_CATEGORY ||
		mode === LOCATION_INTENT_MODES.SAVE_DETAILS ||
		mode === LOCATION_INTENT_MODES.SAVED_MANAGE;
	const isHubMode =
		mode === LOCATION_INTENT_MODES.PLACES_HUB ||
		mode === LOCATION_INTENT_MODES.RECENTS_HUB;
	const isManualMode = mode === LOCATION_INTENT_MODES.MANUAL_STEP;
	const activeHeaderToggleHandler = isSearchMode || isManualMode
		? navigateToDefaultAndClearSearch
		: isCandidateDecisionMode || isNestedDecisionMode || isHubMode
			? navigateBackWithinLocationLoop
			: handleHeaderToggle;
	const activeHeaderCloseHandler = isSearchMode || isManualMode || isCandidateDecisionMode || isNestedDecisionMode || isHubMode
		? navigateToDefaultAndClearSearch
		: onClose;
	const activeHeaderToggleIconName = isSearchMode || isManualMode || isCandidateDecisionMode || isNestedDecisionMode || isHubMode
		? "chevron-back"
		: isExpanded
			? "chevron-down"
			: "chevron-up";
	const activeHeaderToggleAccessibilityLabel = isSearchMode
			? "Back to location choices"
		: isManualMode
			? "Back to location choices"
		: isCandidateDecisionMode
			? "Back to previous location step"
		: isNestedDecisionMode
			? mode === LOCATION_INTENT_MODES.SAVE_DETAILS
				? "Back to save categories"
				: mode === LOCATION_INTENT_MODES.SAVED_MANAGE
					? "Back to saved places"
				: "Back to selected address"
		: isHubMode
			? "Back to location choices"
		: isExpanded
			? "Collapse location sheet"
			: "Expand location sheet";
	const activeHeaderCloseAccessibilityLabel = isSearchMode || isManualMode || isCandidateDecisionMode || isNestedDecisionMode || isHubMode
		? "Close location choices"
		: "Close location sheet";
	const shouldShowActiveHeaderToggle =
		isSearchMode || isManualMode || isCandidateDecisionMode || isNestedDecisionMode || isHubMode || shouldShowHeaderToggle;

	const addToRecents = useLocationStore((s) => s.addSavedLocation);

	const commitLocation = useCallback(
		(nextSelection) => {
			if (!nextSelection) return;
			const pickupPayload = mapCandidateToPickupPayload(nextSelection);
			if (!pickupPayload) return;
			onSelectLocation?.(pickupPayload);
			if (["manual", "search", "recent", "saved", "visit", "pin"].includes(nextSelection.source)) {
				addToRecents?.({
					label: nextSelection.label || "Recent pickup",
					category: "recent",
					address: nextSelection.address,
					latitude: nextSelection.coords.latitude,
					longitude: nextSelection.coords.longitude,
					countryCode: nextSelection.countryCode || null,
					unit: nextSelection.unit || null,
					responderNote: nextSelection.responderNote || null,
					source: "recent",
					recentSource: nextSelection.source,
					sourceSavedAddressId: nextSelection.source === "saved" ? nextSelection.id || null : null,
					usage: {
						lastUsedAt: Date.now(),
						useCount: 1,
					},
				});
			}
			onClose?.();
		},
		[addToRecents, onClose, onSelectLocation],
	);

	const handleUseCurrentLocationCandidate = useCallback(() => {
		if (model.requiresLocationSelection || model.shouldOpenSettings) {
			onUseCurrentLocation?.();
			return;
		}
		const normalized = buildSelectedLocation({
			source: "current",
			label: currentLocation?.primaryText || "Current location",
			address: currentLocation?.secondaryText || currentLocation?.formattedAddress || "",
			coords: currentLocation?.location || currentLocation,
			countryCode: currentLocation?.countryCode || null,
			confidence: "high",
		});
		if (!normalized) return;
		setActiveCandidate(normalized);
		navigateToConfirm();
	}, [
		buildSelectedLocation,
		currentLocation,
		model.requiresLocationSelection,
		model.shouldOpenSettings,
		navigateToConfirm,
		onUseCurrentLocation,
		setActiveCandidate,
	]);

	const recents = useMemo(
		() => buildLocationIntentRecents(savedLocations),
		[savedLocations],
	);
	const savedPlaces = useMemo(
		() => buildLocationIntentSavedPlaces(savedLocations),
		[savedLocations],
	);
	const managedSavedPlaces = useMemo(
		() => buildLocationIntentManagedSavedPlaces(savedLocations),
		[savedLocations],
	);

	const handleOpenManualStep = useCallback(() => {
		setManualError(null);
		setManualStepIndex(0);
		navigateToManualStep();
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [navigateToManualStep, onSnapStateChange]);

	const handleManualCountrySelect = useCallback((country) => {
		if (!country) return;
		setManualDraft((prev) => ({
			...prev,
			country: country.name || prev.country,
			countryCode: country.code || prev.countryCode || "",
			adminArea: "",
			city: "",
			districtArea: "",
			placeOrAddress: "",
		}));
		setManualError(null);
		setManualStepIndex((prev) =>
			prev === 0 ? Math.min(1, MANUAL_LOCATION_STEPS.length - 1) : prev,
		);
	}, []);

	const handleManualConfirm = useCallback(async () => {
		const requiredError = MANUAL_LOCATION_STEPS
			.map((step) => validateManualLocationStep(step, manualDraft))
			.find(Boolean);
		if (requiredError) {
			const nextIndex = MANUAL_LOCATION_STEPS.findIndex((step) =>
				validateManualLocationStep(step, manualDraft),
			);
			setManualStepIndex(Math.max(0, nextIndex));
			setManualError(requiredError);
			return;
		}

		const label = buildManualAddressLabel(manualDraft);
		const address = buildManualAddressParts(manualDraft).join(", ");

		if (!address) {
			setManualError("Add a little more detail so responders know where to go.");
			return;
		}

		setIsResolvingManual(true);
		setManualError(null);

		try {
			const geocoded = await addressAssistService.resolveManualDraft(address, {
				countryCode: manualDraft.countryCode || undefined,
				proximity: locationBias || undefined,
			});

			// PULLBACK NOTE: [LS-9] Gap 2 fix — weak or missing geocode result.
			// OLD: throw or fall back to current GPS.
			// NEW: no fabricated coordinates; stay in manual recovery unless provider returns finite coords.
			// Relevance <0.4 = Mapbox couldn't confidently match the street.
			const isWeakResult =
				typeof geocoded?.relevance === "number" && geocoded.relevance < 0.4;

			if (!geocoded) {
				const placeIndex = MANUAL_LOCATION_STEPS.findIndex(
					(step) => step.key === "placeOrAddress",
				);
				setManualStepIndex(placeIndex >= 0 ? placeIndex : 0);
				setManualError(
					"We couldn't pinpoint that location yet. Try a street number, landmark, or nearby place.",
				);
				return;
			}

			const { latitude, longitude } = geocoded;
			const normalized = buildSelectedLocation({
				source: "manual",
				label,
				address: geocoded.formattedAddress || address,
				coords: { latitude, longitude },
				countryCode: geocoded.countryCode || manualDraft.countryCode || null,
				confidence: isWeakResult ? "low" : "medium",
				pendingPlaceLabel,
			});
			setActiveCandidate(normalized);
			navigateToCandidateDecision();
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
		} catch (_error) {
			const placeIndex = MANUAL_LOCATION_STEPS.findIndex(
				(step) => step.key === "placeOrAddress",
			);
			setManualStepIndex(placeIndex >= 0 ? placeIndex : 0);
			setManualError(
				"We couldn't pinpoint that location yet. Try a street number, landmark, or nearby place.",
			);
		} finally {
			setIsResolvingManual(false);
		}
	}, [buildSelectedLocation, locationBias, manualDraft, navigateToCandidateDecision, pendingPlaceLabel, setActiveCandidate]);

	const handleManualDraftChange = useCallback((key, value) => {
		// Intercept __jumpTo__ sentinel from ManualStepCompletedSummaries edit-tap
		if (key === '__jumpTo__') {
			const targetIdx = Number(value);
			if (Number.isFinite(targetIdx)) {
				setManualError(null);
				clearManualDrop();
				setManualStepIndex(targetIdx);
			}
			return;
		}
		setManualDraft((prev) => ({ ...prev, [key]: value }));
		setManualError(null);
	}, [clearManualDrop]);
	const handleManualDropQueryChange = useCallback((query) => {
		setManualDropQuery(query);
		setManualError(null);
	}, [setManualDropQuery]);

	const handleManualDropSelect = useCallback((key, value, cascadeFields) => {
		setManualDraft((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "adminArea") {
				next.city = "";
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "city") {
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "districtArea") {
				next.placeOrAddress = "";
			}
			if (cascadeFields) {
				Object.entries(cascadeFields).forEach(([cKey, cVal]) => {
					if (cVal && !next[cKey]) next[cKey] = cVal;
				});
			}
			return next;
		});
		clearManualDrop();
		setManualError(null);
		// Advance to next step after selection
		setManualStepIndex((prev) => Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1));
	}, [clearManualDrop]);

	const handleManualCountrySelectInline = useCallback(({ name, code }) => {
		if (!name) return;
		setManualDraft((prev) => ({
			...prev,
			country: name,
			countryCode: code || prev.countryCode || '',
			adminArea: "",
			city: "",
			districtArea: "",
			placeOrAddress: "",
		}));
		setManualError(null);
		setManualStepIndex((prev) => (prev === 0 ? 1 : prev));
	}, []);

	const handleManualUseTypedQuery = useCallback((key, value) => {
		const trimmed = String(value || "").trim();
		if (!trimmed) return;
		setManualDraft((prev) => {
			const next = { ...prev, [key]: trimmed };
			if (key === "adminArea") {
				next.city = "";
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "city") {
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "districtArea") {
				next.placeOrAddress = "";
			}
			return next;
		});
		clearManualDrop();
		setManualError(null);
		setManualStepIndex((prev) =>
			Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1),
		);
	}, [clearManualDrop]);


	const handleNextManualStep = useCallback(() => {
		const currentStep = MANUAL_LOCATION_STEPS[manualStepIndex];
		const typedManualQuery = String(manualDropQuery || "").trim();
		if (
			currentStep?.affordance === "search-drop" &&
			typedManualQuery.length >= 2 &&
			!manualDraft[currentStep.key]
		) {
			handleManualUseTypedQuery(currentStep.key, typedManualQuery);
			return;
		}
		const validationError = validateManualLocationStep(currentStep, manualDraft);
		if (validationError) {
			setManualError(validationError);
			return;
		}

		if (manualStepIndex >= MANUAL_LOCATION_STEPS.length - 1) {
			handleManualConfirm();
			return;
		}

		setManualError(null);
		setManualStepIndex((prev) =>
			Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1),
		);
	}, [
		handleManualConfirm,
		handleManualUseTypedQuery,
		manualDraft,
		manualDropQuery,
		manualStepIndex,
	]);

	const handleSearchQueryChange = setSearchQuery;

	const handlePickSearchResult = useCallback(
		(item) => {
			const mapped = mapSuggestionToLocation(item);
			const candidateCoords = mapped?.location || item.location || {};
			const latitude = Number(candidateCoords.latitude);
			const longitude = Number(candidateCoords.longitude);
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
				setLocationSearchError("We couldn't place that address yet. Try another result.");
				return;
			}
			const normalized = buildSelectedLocation({
				source: "search",
				label: mapped?.primaryText || item.primaryText || "Selected place",
				address:
					mapped?.formattedAddress ||
					mapped?.secondaryText ||
					item.formattedAddress ||
					item.secondaryText ||
					"",
				coords: { latitude, longitude },
				countryCode: mapped?.countryCode || item.countryCode || null,
				confidence: "high",
				pendingPlaceLabel,
			});
			setActiveCandidate(normalized);
			commitSearchQuery(normalized.label);
			navigateToCandidateDecision();
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
		},
		[buildSelectedLocation, commitSearchQuery, navigateToCandidateDecision, onSnapStateChange, pendingPlaceLabel, setActiveCandidate],
	);


	const returnToCandidateDecision = useCallback(() => {
		const nextMode =
			selectedLocation?.source === "current" || selectedLocation?.source === "pin"
				? LOCATION_INTENT_MODES.CONFIRM
				: LOCATION_INTENT_MODES.CANDIDATE_DECISION;
		replaceNavigationStack(nextMode, []);
	}, [replaceNavigationStack, selectedLocation?.source]);

	const handleSaveSelectedLocationAs = useCallback(
		(label) => {
			if (saveSelectedLocationAs(label)) {
				returnToCandidateDecision();
			}
		},
		[returnToCandidateDecision, saveSelectedLocationAs],
	);

	const handleSelectSaveCategory = useCallback(
		(category) => {
			const action = getSaveCategoryAction(category);
			if (!action) return;
			if (!action.requiresDetails) {
				handleSaveSelectedLocationAs(action.category);
				return;
			}
			setPendingSaveCategory(action.category);
			setSaveDetailsDraft({
				label: selectedLocation?.label || selectedLocation?.address || action.label,
				unit: selectedLocation?.unit || "",
				responderNote: selectedLocation?.responderNote || "",
			});
			navigateToSaveDetails();
		},
		[handleSaveSelectedLocationAs, navigateToSaveDetails, selectedLocation],
	);

	const openSavedLocationManage = useCallback(
		(place) => {
			const candidate = mapStoredLocationToCandidate(place.location, place.label);
			if (!candidate) return;
			setPendingPlaceLabel(null);
			setPendingSaveCategory(null);
			setSavedPlaceFeedback(null);
			setIsConfirmingSavedRemove(false);
			const normalized = buildSelectedLocation({
				...candidate,
				source: "saved",
				confidence: "high",
			});
			if (!normalized) return;
			setActiveCandidate(normalized);
			navigateToSavedManage();
		},
		[buildSelectedLocation, navigateToSavedManage, setActiveCandidate],
	);

	const handleEditSavedLocationDetails = useCallback(() => {
		if (!selectedLocation?.id) return;
		const category = getSavedLocationKey(selectedLocation) || selectedLocation.category || "other";
		setPendingSaveCategory(category);
		setSaveDetailsDraft({
			label: selectedLocation.label || selectedLocation.address || "Saved place",
			unit: selectedLocation.unit || "",
			responderNote: selectedLocation.responderNote || "",
		});
		setIsConfirmingSavedRemove(false);
		navigateToSaveDetails();
	}, [navigateToSaveDetails, selectedLocation, setPendingSaveCategory, setSaveDetailsDraft, setIsConfirmingSavedRemove]);

	const handleRemoveSavedLocation = useCallback(() => {
		if (!selectedLocation?.id) return;
		if (!isConfirmingSavedRemove) {
			setIsConfirmingSavedRemove(true);
			return;
		}
		removeSavedEntry(selectedLocation.id);
		navigateToDefaultAndClearSearch();
	}, [
		isConfirmingSavedRemove,
		navigateToDefaultAndClearSearch,
		removeSavedEntry,
		selectedLocation?.id,
	]);

	const handleSavedManageAction = useCallback(
		(action) => {
			if (!action) return;
			if (action.type === "pickup") {
				if (selectedLocation?.id) {
					markSavedAsUsed(selectedLocation.id);
				}
				commitLocation(selectedLocation);
				return;
			}
			if (action.type === "edit") {
				handleEditSavedLocationDetails();
				return;
			}
			if (action.type === "remove") {
				handleRemoveSavedLocation();
			}
		},
		[
			commitLocation,
			handleEditSavedLocationDetails,
			handleRemoveSavedLocation,
			markSavedAsUsed,
			selectedLocation,
		],
	);

	const handleSaveDetailsDraftChange = useCallback((key, value) => {
		setSaveDetailsDraft({ [key]: value });
	}, [setSaveDetailsDraft]);

	const handleConfirmSaveDetails = useCallback(() => {
		const category = pendingSaveCategory || "other";
		const savedLocationId =
			mode === LOCATION_INTENT_MODES.SAVE_DETAILS && selectedLocation?.source === "saved"
				? selectedLocation.id
				: null;
		if (
			saveSelectedLocationAs(category, {
				label: saveDetailsDraft.label,
				unit: saveDetailsDraft.unit,
				responderNote: saveDetailsDraft.responderNote,
				savedLocationId,
			})
		) {
			if (savedLocationId) {
				replaceNavigationStack(LOCATION_INTENT_MODES.SAVED_MANAGE, []);
				return;
			}
			returnToCandidateDecision();
		}
	}, [
		mode,
		pendingSaveCategory,
		replaceNavigationStack,
		returnToCandidateDecision,
		saveDetailsDraft.label,
		saveDetailsDraft.responderNote,
		saveDetailsDraft.unit,
		saveSelectedLocationAs,
		selectedLocation?.id,
		selectedLocation?.source,
	]);

	const handlePrevManualStep = useCallback(() => {
		setManualError(null);
		clearManualDrop();
		if (manualStepIndex <= 0) {
			navigateToDefaultAndClearSearch();
			return;
		}
		setManualStepIndex((prev) => Math.max(0, prev - 1));
	}, [clearManualDrop, manualStepIndex, navigateToDefaultAndClearSearch]);

	const manualNextActionLabel = useMemo(
		() =>
			getManualStepActionLabel({
				step: MANUAL_LOCATION_STEPS[manualStepIndex],
				stepIndex: manualStepIndex,
				stepCount: MANUAL_LOCATION_STEPS.length,
				manualDraft,
				isResolving: isResolvingManual,
			}),
		[isResolvingManual, manualDraft, manualStepIndex],
	);
	const manualHeaderStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const manualHeaderTitle =
		mode === LOCATION_INTENT_MODES.MANUAL_STEP && manualHeaderStep
			? manualHeaderStep.label || "Manual Entry"
			: mode === LOCATION_INTENT_MODES.PLACES_HUB
				? "Saved Places"
				: mode === LOCATION_INTENT_MODES.RECENTS_HUB
					? "Recent Locations"
					: null;
	const manualHeaderSubtitle =
		mode === LOCATION_INTENT_MODES.MANUAL_STEP && manualHeaderStep
			? `Manual Entry · Step ${manualStepIndex + 1} of ${MANUAL_LOCATION_STEPS.length}`
			: null;

	return (
		<>
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={effectiveSnapState}
			presentationMode={effectivePresentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			onHandlePress={handleSnapToggle}
			topSlot={
				isCollapsed ? (
					<MapLocationIntentCollapsedTopRow
						model={model}
						titleColor={tokens.titleColor}
						mutedColor={tokens.mutedText}
						actionSurfaceColor={tokens.closeSurface}
						onToggle={handleHeaderToggle}
						toggleAccessibilityLabel="Expand location sheet"
						toggleIconName="chevron-up"
						onClose={onClose}
						showToggle={shouldShowHeaderToggle}
					/>
				) : (
					<View style={topSlotContainerStyle}>
						<MapLocationIntentActiveTopRow
							model={model}
							titleColor={tokens.titleColor}
							mutedColor={tokens.mutedText}
							actionSurfaceColor={tokens.closeSurface}
							onToggle={activeHeaderToggleHandler}
							toggleAccessibilityLabel={activeHeaderToggleAccessibilityLabel}
							toggleIconName={activeHeaderToggleIconName}
							onClose={activeHeaderCloseHandler}
							closeAccessibilityLabel={activeHeaderCloseAccessibilityLabel}
							showToggle={shouldShowActiveHeaderToggle}
							titleOverride={manualHeaderTitle}
							subtitleOverride={manualHeaderSubtitle}
						/>
					</View>
				)
			}
			footerSlot={
				mode === "manualStep" ? (
					<ManualStepStickyFooter
						onBack={handlePrevManualStep}
						onNext={handleNextManualStep}
						nextLabel={manualNextActionLabel || "Next"}
						isLoading={isResolvingManual}
						titleColor={tokens.titleColor}
						mutedColor={tokens.mutedText}
						infoSurfaceColor={infoSurfaceColor}
						accentColor={themeTokens.accentColor}
					/>
				) : null
			}
		>
			{isCollapsed ? null : (
				<MapStageBodyScroll
					bodyScrollRef={bodyScrollRef}
					viewportStyle={sheetStageStyles.bodyScrollViewport}
					contentContainerStyle={[
						sheetStageStyles.bodyScrollContent,
						effectivePresentationMode === "sheet"
							? sheetStageStyles.bodyScrollContentSheet
							: null,
						effectivePresentationMode === "modal"
							? sheetStageStyles.bodyScrollContentModal
							: null,
						effectivePresentationMode === "panel" || isSidebarPresentation
							? sheetStageStyles.bodyScrollContentPanel
							: null,
						isSidebarPresentation
							? sheetStageStyles.bodyScrollContentSidebar
							: null,
						shouldUseWideStageInset
							? sheetStageStyles.bodyScrollContentWide
							: null,
						modalContainedStyle,
						styles.bodyScrollContent,
					]}
					isSidebarPresentation={isSidebarPresentation}
					allowScrollDetents={allowScrollDetents}
					handleBodyWheel={handleBodyWheel}
					onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
					onScroll={handleAndroidCollapseScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
					androidExpandedBodyStyle={androidExpandedBodyStyle}
				>
					<MapLocationIntentBodyContent
						model={model}
						titleColor={tokens.titleColor}
						mutedColor={tokens.mutedText}
						heroSurfaceColor={themeTokens.heroSurfaceColor}
						groupSurfaceColor={themeTokens.groupSurfaceColor}
						infoSurfaceColor={infoSurfaceColor}
						heroGradientColors={themeTokens.heroGradientColors}
						heroGlowColor={themeTokens.heroGlowColor}
						onUseCurrentLocation={handleUseCurrentLocationCandidate}
						onOpenSearch={openAddressSearch}
						onSelectSavedPlace={(place) => {
							if (place.key === "add") {
								setPendingPlaceLabel("other");
								openAddressSearch();
								return;
							}
							const candidate = mapStoredLocationToCandidate(place.location, place.label);
							if (!candidate) {
								setPendingPlaceLabel(place.key);
								openAddressSearch();
								return;
							}
							openSavedLocationManage(place);
						}}
						onSelectRecentLocation={(recent) => {
							const candidate = mapStoredLocationToCandidate(recent, recent.label || "Recent pickup");
							if (!candidate) return;
							setPendingPlaceLabel(null);
							setSavedPlaceFeedback(null);
							const normalized = buildSelectedLocation({
								...candidate,
								source: recent?.source === "visit" ? "visit" : "recent",
								confidence: "medium",
							});
							if (!normalized) return;
							setActiveCandidate(normalized);
							clearSearch();
							navigateToCandidateDecision();
							onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
						}}
						onOpenManualIntro={handleOpenManualStep}
						onOpenPlacesHub={openPlacesHub}
						onOpenRecentsHub={openRecentsHub}
						onStartPinAdjust={() => {
							const pinSelection = buildSelectedLocation({
								source: "pin",
								label: "Pin-adjusted location",
								address: currentLocation?.formattedAddress || model.headerSubtitle,
								coords: currentLocation?.location || currentLocation,
								confidence: "medium",
							});
							if (!pinSelection) return;
							setActiveCandidate(pinSelection);
							navigateToCandidateDecision();
							onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
						}}
						onConfirmSelection={() => commitLocation(selectedLocation)}
						onFindNearbyHospitals={onFindNearbyHospitals}
						searchQuery={searchQuery}
						onSearchQueryChange={handleSearchQueryChange}
						searchResults={searchResults}
						recentSearchQueries={recentSearchQueries}
						onSelectRecentSearch={(query) => {
							setSearchQuery(query);
						}}
						isSearchingLocations={isSearchingLocations}
						locationSearchError={locationSearchError}
						selectedLocation={selectedLocation}
						onPickSearchResult={handlePickSearchResult}
						onSaveSelectedLocationAs={handleSaveSelectedLocationAs}
						onSelectSaveCategory={handleSelectSaveCategory}
						onOpenSaveCategory={navigateToSaveCategory}
						onSaveDetailsDraftChange={handleSaveDetailsDraftChange}
						onConfirmSaveDetails={handleConfirmSaveDetails}
						onSavedManageAction={handleSavedManageAction}
						recents={recents}
						savedPlaces={savedPlaces}
						managedSavedPlaces={managedSavedPlaces}
						mode={mode}
						manualDraft={manualDraft}
						onManualDraftChange={handleManualDraftChange}
						onNextManualStep={handleNextManualStep}
						onPrevManualStep={handlePrevManualStep}
						onBackToDefault={navigateToDefaultAndClearSearch}
						onBackToPreviousStep={navigateBackWithinLocationLoop}
						manualDropQuery={manualDropQuery}
						manualDropResults={manualDropResults}
						isSearchingManualDrop={isSearchingManualDrop}
						manualDropContextHint={manualDropContextHint}
						onManualDropQueryChange={handleManualDropQueryChange}
						onManualDropSelect={handleManualDropSelect}
						onManualUseTypedQuery={handleManualUseTypedQuery}
						onManualCountrySelectInline={handleManualCountrySelectInline}
						accentColor={themeTokens.accentColor}
						manualError={manualError}
						manualNextActionLabel={manualNextActionLabel}
						isResolvingManual={isResolvingManual}
						savedPlaceFeedback={savedPlaceFeedback}
						pendingSaveCategory={pendingSaveCategory}
						saveDetailsDraft={saveDetailsDraft}
						isConfirmingSavedRemove={isConfirmingSavedRemove}
						manualStepIndex={manualStepIndex}
						isExpanded={isExpanded}
						isDarkMode={isDarkMode}
						responsiveMetrics={responsiveMetrics}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
		{/* CountryPickerModal removed — country selection is now inline in ManualStepActiveField */}
		</>
	);
}
