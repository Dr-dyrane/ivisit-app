import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import CountryPickerModal from "../../../register/CountryPickerModal";
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
import mapboxService from "../../../../services/mapboxService";
import {
	mapCandidateToPickupPayload,
	mapCandidateToSavedAddressPayload,
	normalizeAddressCandidate,
} from "../../../../services/locationAddressService";
import { useLocationStore } from "../../../../stores/locationStore";
import {
	MapLocationIntentActiveTopRow,
	MapLocationIntentBodyContent,
	MapLocationIntentCollapsedTopRow,
} from "./MapLocationIntentStageParts";
import ManualStepStickyFooter from "./ManualStepStickyFooter";
import useAddressSearchController from "./useAddressSearchController";
import useLocationSheetNavigation from "./useLocationSheetNavigation";
import styles from "./mapLocationIntent.styles";

export default function MapLocationIntentStageBase({
	sheetHeight,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	onClose,
	onUseCurrentLocation,
	onSelectLocation,
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
		stateRegion: "",
		city: "",
		streetAddress: "",
		unit: "",
		responderNote: "",
	});
	const [selectedLocation, setSelectedLocation] = useState(null);
	const [manualError, setManualError] = useState(null);
	const [isResolvingManual, setIsResolvingManual] = useState(false);
	const [manualDropQuery, setManualDropQuery] = useState('');
	const [manualDropResults, setManualDropResults] = useState([]);
		const [countryPickerVisible, setCountryPickerVisible] = useState(false);
	const [pendingPlaceLabel, setPendingPlaceLabel] = useState(null);
	const [savedPlaceFeedback, setSavedPlaceFeedback] = useState(null);
	const [pendingSaveCategory, setPendingSaveCategory] = useState(null);
	const [saveDetailsDraft, setSaveDetailsDraft] = useState({
		label: "",
		unit: "",
		responderNote: "",
	});
	const savedLocations = useLocationStore((state) => state.savedLocations || []);
	const addSavedLocation = useLocationStore((state) => state.addSavedLocation);
	const updateSavedLocation = useLocationStore((state) => state.updateSavedLocation);
	const removeSavedLocation = useLocationStore((state) => state.removeSavedLocation);
	const [isConfirmingSavedRemove, setIsConfirmingSavedRemove] = useState(false);
	const resetTransientStateForDefault = useCallback(() => {
		setManualError(null);
		setManualStepIndex(0);
		setPendingPlaceLabel(null);
		setSavedPlaceFeedback(null);
		setPendingSaveCategory(null);
		setSaveDetailsDraft({ label: "", unit: "", responderNote: "" });
		setIsConfirmingSavedRemove(false);
	}, []);
	const locationNavigation = useLocationSheetNavigation({
		onResetToDefault: resetTransientStateForDefault,
	});
	const {
		mode,
		isSearchMode,
		openAddressSearch: navigateToAddressSearch,
		openManualStep: navigateToManualStep,
		openConfirm: navigateToConfirm,
		openPlaceSelected: navigateToPlaceSelected,
		openPinAdjust: navigateToPinAdjust,
		openSaveCategory: navigateToSaveCategory,
		openSaveDetails: navigateToSaveDetails,
		openSavedManage: navigateToSavedManage,
		replaceModeStack: replaceNavigationStack,
		returnToDefault: navigateToDefault,
		goBack: navigateBack,
		stack: navigationStack,
	} = locationNavigation;
	const openAddressSearch = useCallback(() => {
		setSavedPlaceFeedback(null);
		navigateToAddressSearch();
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [navigateToAddressSearch, onSnapStateChange]);
	const locationBias = useMemo(
		() => currentLocation?.location || currentLocation || null,
		[currentLocation],
	);
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
		mode === LOCATION_INTENT_MODES.PLACE_SELECTED ||
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.PIN_ADJUST;
	const isNestedDecisionMode =
		mode === LOCATION_INTENT_MODES.SAVE_CATEGORY ||
		mode === LOCATION_INTENT_MODES.SAVE_DETAILS ||
		mode === LOCATION_INTENT_MODES.SAVED_MANAGE;
	const activeHeaderToggleHandler = isSearchMode
		? navigateToDefaultAndClearSearch
		: isCandidateDecisionMode || isNestedDecisionMode
			? navigateBackWithinLocationLoop
			: handleHeaderToggle;
	const activeHeaderCloseHandler = isSearchMode || isCandidateDecisionMode || isNestedDecisionMode
		? navigateToDefaultAndClearSearch
		: onClose;
	const activeHeaderToggleIconName = isSearchMode || isCandidateDecisionMode || isNestedDecisionMode
		? "chevron-back"
		: isExpanded
			? "chevron-down"
			: "chevron-up";
	const activeHeaderToggleAccessibilityLabel = isSearchMode
			? "Back to location choices"
		: isCandidateDecisionMode
			? "Back to previous location step"
		: isNestedDecisionMode
			? mode === LOCATION_INTENT_MODES.SAVE_DETAILS
				? "Back to save categories"
				: mode === LOCATION_INTENT_MODES.SAVED_MANAGE
					? "Back to saved places"
				: "Back to selected address"
		: isExpanded
			? "Collapse location sheet"
			: "Expand location sheet";
	const activeHeaderCloseAccessibilityLabel = isSearchMode || isCandidateDecisionMode || isNestedDecisionMode
		? "Close location choices"
		: "Close location sheet";
	const shouldShowActiveHeaderToggle =
		isSearchMode || isCandidateDecisionMode || isNestedDecisionMode || shouldShowHeaderToggle;

	const buildSelectedLocation = useCallback(
		(payload) =>
			normalizeAddressCandidate(
				{
					...payload,
					unit: payload?.unit || manualDraft.unit || undefined,
					responderNote:
						payload?.responderNote || manualDraft.responderNote || undefined,
					pendingSaveCategory:
						payload?.pendingSaveCategory ||
						payload?.pendingPlaceLabel ||
						pendingPlaceLabel ||
						undefined,
					countryCode:
						payload?.countryCode ||
						manualDraft.countryCode ||
						locationControl?.currentCountryCode ||
						undefined,
				},
				{
					source: payload?.source || "manual",
					confidence: payload?.confidence || "medium",
				},
			),
		[
			locationControl?.currentCountryCode,
			manualDraft.countryCode,
			manualDraft.responderNote,
			manualDraft.unit,
			pendingPlaceLabel,
		],
	);

	const commitLocation = useCallback(
		(nextSelection) => {
			if (!nextSelection) return;
			const pickupPayload = mapCandidateToPickupPayload(nextSelection);
			if (!pickupPayload) return;
			onSelectLocation?.(pickupPayload);
			if (["manual", "search", "recent", "saved", "visit", "pin"].includes(nextSelection.source)) {
				addSavedLocation?.({
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
		[addSavedLocation, onClose, onSelectLocation],
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
		setSelectedLocation(normalized);
		navigateToConfirm();
	}, [
		buildSelectedLocation,
		currentLocation,
		model.requiresLocationSelection,
		model.shouldOpenSettings,
		navigateToConfirm,
		onUseCurrentLocation,
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
	}, [navigateToManualStep]);

	const handleManualCountrySelect = useCallback((country) => {
		if (!country) return;
		setManualDraft((prev) => ({
			...prev,
			country: country.name || prev.country,
			countryCode: country.code || prev.countryCode || "",
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
			const geocoded = await mapboxService.geocodeAddress(address);
			const latitude = Number(geocoded?.latitude);
			const longitude = Number(geocoded?.longitude);
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
				throw new Error("manual_geocode_missing_coordinates");
			}
			const normalized = buildSelectedLocation({
				source: "manual",
				label,
				address: geocoded?.formatted_address || address,
				coords: { latitude, longitude },
				countryCode: geocoded?.countryCode || manualDraft.countryCode || null,
				confidence: "medium",
			});
			setSelectedLocation(normalized);
			navigateToConfirm();
		} catch (_error) {
			setManualStepIndex(3);
			setManualError(
				"We couldn't place that pickup yet. Add a street number, place name, or nearby landmark.",
			);
		} finally {
			setIsResolvingManual(false);
		}
	}, [buildSelectedLocation, manualDraft, navigateToConfirm]);

	const handleManualDraftChange = useCallback((key, value) => {
		// Intercept __jumpTo__ sentinel from ManualStepCompletedSummaries edit-tap
		if (key === '__jumpTo__') {
			const targetIdx = Number(value);
			if (Number.isFinite(targetIdx)) {
				setManualError(null);
				setManualStepIndex(targetIdx);
			}
			return;
		}
		setManualDraft((prev) => ({ ...prev, [key]: value }));
		setManualError(null);
	}, []);
	const handleManualDropQueryChange = useCallback((query) => {
		setManualDropQuery(query);
		setManualError(null);
	}, []);

	const handleManualDropSelect = useCallback((key, value, cascadeFields) => {
		setManualDraft((prev) => {
			const next = { ...prev, [key]: value };
			if (cascadeFields) {
				Object.entries(cascadeFields).forEach(([cKey, cVal]) => {
					if (!prev[cKey]) next[cKey] = cVal;
				});
			}
			return next;
		});
		setManualDropQuery('');
		setManualDropResults([]);
		setManualError(null);
		// Advance to next step after selection
		setManualStepIndex((prev) => Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1));
	}, []);

	// Build contextual hint for placeholder + query scoping (e.g. "Lagos, Nigeria")
	const manualDropContextHint = useMemo(() => {
		const parts = [
			manualDraft.city,
			manualDraft.stateRegion,
			manualDraft.country,
		].filter(Boolean);
		return parts.length > 0 ? parts.join(', ') : '';
	}, [manualDraft.city, manualDraft.stateRegion, manualDraft.country]);

	// Debounced Mapbox search for state/city/street drop steps (affordance: "search-drop")
	// Appends city + state + country context to the query for scoped results.
	const manualDropTimerRef = useRef(null);
	useEffect(() => {
		const currentStep = MANUAL_LOCATION_STEPS[manualStepIndex];
		if (!currentStep || currentStep.affordance !== 'search-drop') {
			setManualDropResults([]);
			return;
		}
		const trimmed = manualDropQuery.trim();
		if (trimmed.length < 2) {
			setManualDropResults([]);
			return;
		}
		// Append context so Mapbox scopes results — e.g. "Victoria Lagos Nigeria"
		const contextParts = [
			manualDraft.city,
			manualDraft.stateRegion,
			manualDraft.country,
		].filter(Boolean);
		const contextSuffix = contextParts.length > 0 ? ' ' + contextParts.join(' ') : '';
		const contextualQuery = trimmed + contextSuffix;

		if (manualDropTimerRef.current) clearTimeout(manualDropTimerRef.current);
		manualDropTimerRef.current = setTimeout(async () => {
			try {
				const results = await mapboxService.suggestAddresses({
					query: contextualQuery,
					proximity: locationBias || null,
					countryCode: manualDraft.countryCode || undefined,
					types: currentStep.mapboxTypes || undefined,
				});
				setManualDropResults(Array.isArray(results) ? results : []);
			} catch {
				setManualDropResults([]);
			}
		}, 320);
		return () => {
			if (manualDropTimerRef.current) clearTimeout(manualDropTimerRef.current);
		};
	}, [
		manualDropQuery,
		manualStepIndex,
		locationBias,
		manualDraft.countryCode,
		manualDraft.country,
		manualDraft.stateRegion,
		manualDraft.city,
	]);

	const handleManualCountrySelectInline = useCallback(({ name, code }) => {
		if (!name) return;
		setManualDraft((prev) => ({
			...prev,
			country: name,
			countryCode: code || prev.countryCode || '',
		}));
		setManualError(null);
		setManualStepIndex((prev) => (prev === 0 ? 1 : prev));
	}, []);


	const handleNextManualStep = useCallback(() => {
		const currentStep = MANUAL_LOCATION_STEPS[manualStepIndex];
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
		manualDraft,
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
			});
			setSelectedLocation(normalized);
			commitSearchQuery(normalized.label);
			navigateToPlaceSelected();
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF);
		},
		[buildSelectedLocation, commitSearchQuery, navigateToPlaceSelected, onSnapStateChange],
	);

	const saveSelectedLocationAs = useCallback(
		(label, details = {}) => {
			if (!selectedLocation || !label) return false;
			const normalizedLabel = String(label).trim().toLowerCase();
			const shouldUpdateCategorySlot =
				normalizedLabel === "home" || normalizedLabel === "work";
			const shouldUseCandidateLabel = !shouldUpdateCategorySlot;
			const draftLabel = String(details.label || "").trim();
			const displayLabel =
				draftLabel ||
				(shouldUseCandidateLabel
					? selectedLocation.label || selectedLocation.address || "Saved place"
					: label);
			const savedPayload = mapCandidateToSavedAddressPayload(
				{
					...selectedLocation,
					unit: details.unit || selectedLocation.unit,
					responderNote: details.responderNote || selectedLocation.responderNote,
				},
				{
				label: displayLabel,
				category: normalizedLabel,
				},
			);
			if (!savedPayload) return false;
			if (details.savedLocationId) {
				updateSavedLocation?.(details.savedLocationId, savedPayload);
				setSelectedLocation(
					normalizeAddressCandidate(
						{ ...savedPayload, id: details.savedLocationId, source: "saved" },
						{ source: "saved", confidence: "high" },
					) || selectedLocation,
				);
				setSavedPlaceFeedback(label);
				return true;
			}
			// Rollback note: Home/Work are singleton identity slots. Generic saved
			// places are not; they should preserve the selected place name and let
			// the store dedupe only by same address/coords.
			const existing = shouldUpdateCategorySlot
				? savedLocations.find(
						(item) =>
							String(item?.category || item?.label || "").toLowerCase() ===
							normalizedLabel,
					)
				: null;
			if (existing?.id) {
				updateSavedLocation?.(existing.id, savedPayload);
				setSavedPlaceFeedback(label);
				return true;
			}
			addSavedLocation?.(savedPayload);
			setSavedPlaceFeedback(label);
			return true;
		},
		[
			addSavedLocation,
			savedLocations,
			selectedLocation,
			updateSavedLocation,
		],
	);

	const returnToCandidateDecision = useCallback(() => {
		const nextMode =
			selectedLocation?.source === "current" || selectedLocation?.source === "pin"
				? LOCATION_INTENT_MODES.CONFIRM
				: LOCATION_INTENT_MODES.PLACE_SELECTED;
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
			setSelectedLocation(normalized);
			navigateToSavedManage();
		},
		[buildSelectedLocation, navigateToSavedManage],
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
	}, [navigateToSaveDetails, selectedLocation]);

	const handleRemoveSavedLocation = useCallback(() => {
		if (!selectedLocation?.id) return;
		if (!isConfirmingSavedRemove) {
			setIsConfirmingSavedRemove(true);
			return;
		}
		removeSavedLocation?.(selectedLocation.id);
		setIsConfirmingSavedRemove(false);
		navigateToDefaultAndClearSearch();
	}, [
		isConfirmingSavedRemove,
		navigateToDefaultAndClearSearch,
		removeSavedLocation,
		selectedLocation?.id,
	]);

	const handleSavedManageAction = useCallback(
		(action) => {
			if (!action) return;
			if (action.type === "pickup") {
				if (selectedLocation?.id) {
					const existingSavedLocation = savedLocations.find(
						(item) => item?.id === selectedLocation.id,
					);
					updateSavedLocation?.(selectedLocation.id, {
						usage: {
							lastUsedAt: Date.now(),
							useCount: Number(existingSavedLocation?.usage?.useCount || 0) + 1,
						},
					});
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
			savedLocations,
			selectedLocation,
			updateSavedLocation,
		],
	);

	const handleSaveDetailsDraftChange = useCallback((key, value) => {
		setSaveDetailsDraft((prev) => ({ ...prev, [key]: value }));
	}, []);

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
		if (manualStepIndex <= 0) {
			navigateToDefaultAndClearSearch();
			return;
		}
		setManualStepIndex((prev) => Math.max(0, prev - 1));
	}, [manualStepIndex, navigateToDefaultAndClearSearch]);

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
							setSelectedLocation(normalized);
							clearSearch();
							navigateToPlaceSelected();
							onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF);
						}}
						onOpenManualIntro={handleOpenManualStep}
						onStartPinAdjust={() => {
							const pinSelection = buildSelectedLocation({
								source: "pin",
								label: "Pin-adjusted location",
								address: currentLocation?.formattedAddress || model.headerSubtitle,
								coords: currentLocation?.location || currentLocation,
								confidence: "medium",
							});
							if (!pinSelection) return;
							setSelectedLocation(pinSelection);
							navigateToPinAdjust();
						}}
						onConfirmSelection={() => commitLocation(selectedLocation)}
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
						manualDropContextHint={manualDropContextHint}
						onManualDropQueryChange={handleManualDropQueryChange}
						onManualDropSelect={handleManualDropSelect}
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
