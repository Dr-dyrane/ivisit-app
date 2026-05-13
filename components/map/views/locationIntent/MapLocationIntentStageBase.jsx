import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import {
	GLASS_SURFACE_VARIANTS,
	getGlassSurfaceTokens,
} from "../../../../constants/surfaces";
import MapSheetShell from "../../MapSheetShell";
import { getMapSheetHeight, MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
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
import buildLocationIntentThemeTokens from "./mapLocationIntent.theme";
import {
	buildLocationIntentManagedSavedPlaces,
	buildLocationIntentRecents,
	buildLocationIntentSavedPlaces,
	mapStoredLocationToCandidate,
} from "./mapLocationIntent.helpers";
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
import useManualEntryHandlers from "../../../../hooks/map/locationIntent/useManualEntryHandlers";
import useCandidateHandlers from "../../../../hooks/map/locationIntent/useCandidateHandlers";
import { useAndroidKeyboardAwareModal } from "../../../../hooks/ui/useAndroidKeyboardAwareModal";
import styles from "./mapLocationIntent.styles";

const LOCATION_INTENT_MODE_SNAP_POLICY = Object.freeze({
	[LOCATION_INTENT_MODES.DEFAULT]: MAP_SHEET_SNAP_STATES.HALF,
	[LOCATION_INTENT_MODES.ADDRESS_SEARCH]: MAP_SHEET_SNAP_STATES.EXPANDED,
	[LOCATION_INTENT_MODES.MANUAL_STEP]: MAP_SHEET_SNAP_STATES.EXPANDED,
	[LOCATION_INTENT_MODES.PLACES_HUB]: MAP_SHEET_SNAP_STATES.EXPANDED,
	[LOCATION_INTENT_MODES.RECENTS_HUB]: MAP_SHEET_SNAP_STATES.EXPANDED,
	[LOCATION_INTENT_MODES.CANDIDATE_DECISION]: MAP_SHEET_SNAP_STATES.HALF,
	[LOCATION_INTENT_MODES.CONFIRM]: MAP_SHEET_SNAP_STATES.HALF,
	[LOCATION_INTENT_MODES.PIN_ADJUST]: MAP_SHEET_SNAP_STATES.HALF,
	[LOCATION_INTENT_MODES.SAVE_CATEGORY]: MAP_SHEET_SNAP_STATES.EXPANDED,
	[LOCATION_INTENT_MODES.SAVE_DETAILS]: MAP_SHEET_SNAP_STATES.EXPANDED,
	[LOCATION_INTENT_MODES.SAVED_MANAGE]: MAP_SHEET_SNAP_STATES.EXPANDED,
});

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
		crudStatus,
		CRUD_STATUS,
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
		setManualDraft({
			country: "",
			countryCode: "",
			adminArea: "",
			city: "",
			districtArea: "",
			placeOrAddress: "",
			unit: "",
			responderNote: "",
		});
		setIsResolvingManual(false);
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
	const {
		keyboardHeight,
		modalHeight: keyboardAwareModalHeight,
	} = useAndroidKeyboardAwareModal({
		defaultHeight: Number.isFinite(Number(sheetHeight)) ? Number(sheetHeight) : undefined,
		maxHeightPercentage: 0.92,
	});
	// PULLBACK NOTE: [keyboard-collapse-fix v2] Android-only gate.
	// OLD: Platform.OS !== "web" - fired on iOS too via keyboardWillShow,
	//      setting keyboardHeight>0 before keyboard animation and causing
	//      unintended sheet height mutations on a platform that handles
	//      keyboard avoidance natively.
	// NEW: Platform.OS === "android" only - matches the hook's own guard
	//      (modalHeight is only mutated inside Platform.OS === 'android' blocks).
	// PULLBACK NOTE: [keyboard-collapse-fix v3] Only shrink sheet height when
	// mode does NOT require EXPANDED. EXPANDED-policy modes (ADDRESS_SEARCH,
	// MANUAL_STEP, etc.) lock the sheet at full height; shrinking the sheetHeight
	// prop cascades into MapSheetShell and triggers the collapse we're fixing.
	// Non-EXPANDED modes (DEFAULT to HALF) can still benefit from keyboard resize.
	// OLD: any mode with keyboard visible could trigger shrink
	// NEW: shrink only when policy is NOT EXPANDED (i.e. DEFAULT/HALF modes)
	const modeSnapPolicy = LOCATION_INTENT_MODE_SNAP_POLICY[mode] ?? MAP_SHEET_SNAP_STATES.HALF;
	const shouldApplyKeyboardResize =
		Platform.OS === "android" &&
		keyboardHeight > 0 &&
		modeSnapPolicy !== MAP_SHEET_SNAP_STATES.EXPANDED;
	const keyboardAwareSheetHeight =
		shouldApplyKeyboardResize && Number.isFinite(Number(sheetHeight))
			? Math.max(320, Math.min(Number(sheetHeight), keyboardAwareModalHeight))
			: sheetHeight;
	const keyboardAwareBodyPadding = shouldApplyKeyboardResize
		? { paddingBottom: Platform.OS === "android" ? 32 : 24 }
		: null;
	// PULLBACK NOTE: [keyboard-collapse-fix v4] Android sheetHeight freeze.
	// Root cause: useMapSheetShell useEffect([sheetHeight]) springs the Animated.Value
	// to the prop. On Android, keyboard open shrinks useWindowDimensions().height ->
	// orchestrator recomputes sheetHeight smaller -> spring animates sheet DOWN.
	// snapState/allowedSnapStates guards don't help - collapse is at Animated layer.
	// Fix: freeze pre-keyboard screenHeight in a ref (Android only), use it to
	// recompute EXPANDED sheetHeight so the Animated target never shrinks.
	// iOS: screenHeight stable on keyboard open - no freeze needed.
	// Web: Keyboard API no-op, keyboardHeight always 0 - freeze would never activate.
	const { height: screenHeight } = useWindowDimensions();
	const preKeyboardScreenHeightRef = useRef(screenHeight);
	if (Platform.OS === "android" && keyboardHeight === 0) {
		preKeyboardScreenHeightRef.current = screenHeight;
	}
	// PULLBACK NOTE: [X-10] LocationSheet mode/snap transition owner.
	// OLD: handlers called navigateToX() and onSnapStateChange() separately.
	// NEW: StageBase pairs the target mode with its snap policy in one callback,
	// matching the main search sheet lesson: one owner decides the surface state.
	const transitionLocationMode = useCallback(
		(nextMode, navigate) => {
			const nextSnapState =
				LOCATION_INTENT_MODE_SNAP_POLICY[nextMode] || MAP_SHEET_SNAP_STATES.HALF;
			onSnapStateChange?.(nextSnapState);
			navigate?.();
		},
		[onSnapStateChange],
	);
	const transitionToAddressSearch = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.ADDRESS_SEARCH, navigateToAddressSearch),
		[navigateToAddressSearch, transitionLocationMode],
	);
	const transitionToManualStep = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.MANUAL_STEP, navigateToManualStep),
		[navigateToManualStep, transitionLocationMode],
	);
	const transitionToConfirm = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.CONFIRM, navigateToConfirm),
		[navigateToConfirm, transitionLocationMode],
	);
	const transitionToCandidateDecision = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.CANDIDATE_DECISION, navigateToCandidateDecision),
		[navigateToCandidateDecision, transitionLocationMode],
	);
	const transitionToSaveCategory = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.SAVE_CATEGORY, navigateToSaveCategory),
		[navigateToSaveCategory, transitionLocationMode],
	);
	const transitionToSaveDetails = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.SAVE_DETAILS, navigateToSaveDetails),
		[navigateToSaveDetails, transitionLocationMode],
	);
	const transitionToSavedManage = useCallback(
		() => transitionLocationMode(LOCATION_INTENT_MODES.SAVED_MANAGE, navigateToSavedManage),
		[navigateToSavedManage, transitionLocationMode],
	);
	const transitionReplaceModeStack = useCallback(
		(nextMode, stack = []) => {
			const nextSnapState =
				LOCATION_INTENT_MODE_SNAP_POLICY[nextMode] || MAP_SHEET_SNAP_STATES.HALF;
			onSnapStateChange?.(nextSnapState);
			replaceNavigationStack(nextMode, stack);
		},
		[onSnapStateChange, replaceNavigationStack],
	);
	const openAddressSearch = useCallback(() => {
		setSavedPlaceFeedback(null);
		transitionToAddressSearch();
	}, [setSavedPlaceFeedback, transitionToAddressSearch]);

	const openPlacesHub = useCallback(() => {
		transitionLocationMode(LOCATION_INTENT_MODES.PLACES_HUB, navigateToPlacesHub);
	}, [navigateToPlacesHub, transitionLocationMode]);

	const openRecentsHub = useCallback(() => {
		transitionLocationMode(LOCATION_INTENT_MODES.RECENTS_HUB, navigateToRecentsHub);
	}, [navigateToRecentsHub, transitionLocationMode]);

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
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF);
		navigateToDefault();
	}, [clearSearch, navigateToDefault, onSnapStateChange]);
	const navigateBackWithinLocationLoop = useCallback(() => {
		if (navigationStack.length > 0) {
			const nextMode = navigationStack[navigationStack.length - 1] || LOCATION_INTENT_MODES.DEFAULT;
			const nextSnapState =
				LOCATION_INTENT_MODE_SNAP_POLICY[nextMode] || MAP_SHEET_SNAP_STATES.HALF;
			onSnapStateChange?.(nextSnapState);
			navigateBack();
			return;
		}
		navigateToDefaultAndClearSearch();
	}, [navigateBack, navigateToDefaultAndClearSearch, navigationStack, onSnapStateChange]);

	useEffect(() => {
		const seededQuery =
			typeof sheetPayload?.addressQuery === "string" ||
			typeof sheetPayload?.query === "string"
				? String(sheetPayload.addressQuery || sheetPayload.query).trim()
				: "";
		if (seededQuery) {
			setSearchQuery(seededQuery, { open: false });
			openAddressSearch();
		}
	}, [
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
	const lastSnapPolicyKeyRef = useRef(null);

	// PULLBACK NOTE: [keyboard-collapse-fix v2] mirror MapCommitDetailsStageBase pattern.
	// OLD: effectiveSnapState derived from snapState prop + keyboard guard - fragile race window
	//      because keyboardRequiresExpanded was false until keyboardDidShow fired.
	// NEW: modeRequiresExpanded derived purely from snap policy (no keyboard dep).
	//      When true: hardcode EXPANDED constant + restrict allowedSnapStates to [EXPANDED],
	//      so panResponder, detents, and parent prop cannot produce a down-snap.
	//      Identical to how MapCommitDetailsStageBase locks its sheet.
	const modeRequiresExpanded =
		effectivePresentationMode === "sheet" &&
		LOCATION_INTENT_MODE_SNAP_POLICY[mode] === MAP_SHEET_SNAP_STATES.EXPANDED;
	// PULLBACK NOTE: [keyboard-collapse-fix TDZ fix]
	// OLD: resolvedSheetHeight was above modeRequiresExpanded - TDZ ReferenceError on line 249
	// NEW: moved here, after modeRequiresExpanded is declared
	const resolvedSheetHeight =
		modeRequiresExpanded && Platform.OS === "android"
			? getMapSheetHeight(preKeyboardScreenHeightRef.current, MAP_SHEET_SNAP_STATES.EXPANDED)
			: keyboardAwareSheetHeight;
	const effectiveSnapState = modeRequiresExpanded
		? MAP_SHEET_SNAP_STATES.EXPANDED
		: effectivePresentationMode === "sheet"
			? snapState
			: MAP_SHEET_SNAP_STATES.EXPANDED;
	const shouldShowHeaderToggle = effectivePresentationMode === "sheet";
	const isCollapsed = effectiveSnapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isExpanded = effectiveSnapState === MAP_SHEET_SNAP_STATES.EXPANDED;
	const allowedSnapStates = useMemo(
		() => {
			if (modeRequiresExpanded) return [MAP_SHEET_SNAP_STATES.EXPANDED];
			if (effectivePresentationMode === "sheet") {
				return [
					MAP_SHEET_SNAP_STATES.COLLAPSED,
					MAP_SHEET_SNAP_STATES.HALF,
					MAP_SHEET_SNAP_STATES.EXPANDED,
				];
			}
			return [MAP_SHEET_SNAP_STATES.EXPANDED];
		},
		[effectivePresentationMode, modeRequiresExpanded],
	);
	useLayoutEffect(() => {
		if (effectivePresentationMode !== "sheet") return;
		const policyKey = `${mode}:${effectivePresentationMode}`;
		if (lastSnapPolicyKeyRef.current === policyKey) return;
		lastSnapPolicyKeyRef.current = policyKey;
		const requestedSnapState =
			LOCATION_INTENT_MODE_SNAP_POLICY[mode] || MAP_SHEET_SNAP_STATES.HALF;
		if (requestedSnapState !== snapState) {
			onSnapStateChange?.(requestedSnapState);
		}
	// PULLBACK NOTE: [keyboard-collapse-fix] removed snapState from deps.
	// OLD: [..., snapState] - caused re-runs on every parent render while
	//      keyboard was open, creating a race window where stale HALF prop
	//      slipped through when policyKey was already cached.
	// NEW: mode + presentationMode only - the policyKey gate is sufficient.
	}, [effectivePresentationMode, mode, onSnapStateChange]);
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

	const addToRecents = useLocationStore((s) => s.addSavedLocation);

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
	// PULLBACK NOTE: [X-2] Manual entry handlers extracted to useManualEntryHandlers hook.
	// OLD: 10 useCallback blocks + manualNextActionLabel useMemo inline here.
	// NEW: single hook call; state stays in StageBase so useManualDropController can consume it.
	const {
		manualNextActionLabel,
		resetManualState,
		handleOpenManualStep,
		handleManualConfirm,
		handleManualDraftChange,
		handleManualDropQueryChange,
		handleManualDropSelect,
		handleManualCountrySelectInline,
		handleManualUseTypedQuery,
		handleNextManualStep,
		handlePrevManualStep,
	} = useManualEntryHandlers({
		manualStepIndex,
		manualDraft,
		manualError,
		isResolvingManual,
		setManualStepIndex,
		setManualDraft,
		setManualError,
		setIsResolvingManual,
		locationBias,
		pendingPlaceLabel,
		buildSelectedLocation,
		setActiveCandidate,
		navigateToManualStep: transitionToManualStep,
		navigateToCandidateDecision: transitionToCandidateDecision,
		navigateToDefaultAndClearSearch,
		clearManualDrop,
		setManualDropQuery,
		manualDropQuery,
		clearSearch,
	});

	// PULLBACK NOTE: [X-3] Candidate + save handlers extracted to useCandidateHandlers hook.
	// OLD: commitLocation + 11 useCallback blocks inline here.
	// NEW: single hook call; save state stays in useSavedAddressActions in StageBase.
	const {
		commitLocation,
		handleUseCurrentLocationCandidate,
		handlePickSearchResult,
		returnToCandidateDecision,
		handleSaveSelectedLocationAs,
		handleSelectSaveCategory,
		openSavedLocationManage,
		handleEditSavedLocationDetails,
		handleRemoveSavedLocation,
		handleSavedManageAction,
		handleSaveDetailsDraftChange,
		handleConfirmSaveDetails,
	} = useCandidateHandlers({
		buildSelectedLocation,
		setActiveCandidate,
		currentLocation,
		selectedLocation,
		pendingPlaceLabel,
		pendingSaveCategory,
		saveDetailsDraft,
		isConfirmingSavedRemove,
		setPendingPlaceLabel,
		setPendingSaveCategory,
		setSavedPlaceFeedback,
		setSaveDetailsDraft,
		setIsConfirmingSavedRemove,
		saveSelectedLocationAs,
		removeSavedEntry,
		markSavedAsUsed,
		commitSearchQuery,
		setLocationSearchError,
		mode,
		navigateToConfirm: transitionToConfirm,
		navigateToCandidateDecision: transitionToCandidateDecision,
		navigateToSaveDetails: transitionToSaveDetails,
		navigateToSavedManage: transitionToSavedManage,
		navigateToDefaultAndClearSearch,
		replaceNavigationStack: transitionReplaceModeStack,
		onSelectLocation,
		onClose,
		addToRecents,
		requiresLocationSelection: model.requiresLocationSelection,
		shouldOpenSettings: model.shouldOpenSettings,
		onUseCurrentLocation,
	});

	const activeHeaderToggleHandler = isSearchMode || isManualMode
		? isManualMode
			? handlePrevManualStep
			: navigateToDefaultAndClearSearch
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

	const handleSearchQueryChange = setSearchQuery;

	const manualHeaderStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const locationHeaderModel = useMemo(() => {
		if (mode === LOCATION_INTENT_MODES.ADDRESS_SEARCH) {
			return {
				title: "Search Location",
				subtitle: "Choose A Pickup Address",
			};
		}
		if (mode === LOCATION_INTENT_MODES.MANUAL_STEP && manualHeaderStep) {
			return {
				title: "Manual Location",
				subtitle: `Step ${manualStepIndex + 1} Of ${MANUAL_LOCATION_STEPS.length} - ${manualHeaderStep.label}`,
			};
		}
		if (mode === LOCATION_INTENT_MODES.PLACES_HUB) {
			return {
				title: "Saved Places",
				subtitle: "Manage Pickup Addresses",
			};
		}
		if (mode === LOCATION_INTENT_MODES.RECENTS_HUB) {
			return {
				title: "Recent Locations",
				subtitle: "Choose A Recent Pickup",
			};
		}
		if (mode === LOCATION_INTENT_MODES.CANDIDATE_DECISION || mode === LOCATION_INTENT_MODES.CONFIRM) {
			return {
				title: "Selected Address",
				subtitle: "Choose What To Do Next",
			};
		}
		if (mode === LOCATION_INTENT_MODES.SAVE_CATEGORY) {
			return {
				title: "Save Place",
				subtitle: "Choose A Place Type",
			};
		}
		if (mode === LOCATION_INTENT_MODES.SAVE_DETAILS) {
			return {
				title: "Place Details",
				subtitle: "Name This Saved Place",
			};
		}
		if (mode === LOCATION_INTENT_MODES.SAVED_MANAGE) {
			return {
				title: "Saved Place",
				subtitle: "Manage This Address",
			};
		}
		if (mode === LOCATION_INTENT_MODES.PIN_ADJUST) {
			return {
				title: "Adjust Pin",
				subtitle: "Confirm The Pickup Point",
			};
		}
		return {
			title: null,
			subtitle: null,
		};
	}, [manualHeaderStep, manualStepIndex, mode]);

	return (
		<>
		<MapSheetShell
			sheetHeight={resolvedSheetHeight}
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
							titleOverride={locationHeaderModel.title}
							subtitleOverride={locationHeaderModel.subtitle}
						/>
					</View>
				)
			}
			footerSlot={
				mode === LOCATION_INTENT_MODES.MANUAL_STEP ? (
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
			{!isCollapsed && (
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
						keyboardAwareBodyPadding,
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
					automaticallyAdjustKeyboardInsets={mode === LOCATION_INTENT_MODES.MANUAL_STEP}
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
							transitionToCandidateDecision();
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
							transitionToCandidateDecision();
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
						onOpenSaveCategory={transitionToSaveCategory}
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
						crudStatus={crudStatus}
						CRUD_STATUS={CRUD_STATUS}
						manualStepIndex={manualStepIndex}
						isExpanded={isExpanded}
						isDarkMode={isDarkMode}
						responsiveMetrics={responsiveMetrics}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
		{/* CountryPickerModal removed - country selection is now inline in ManualStepActiveField */}
		</>
	);
}
