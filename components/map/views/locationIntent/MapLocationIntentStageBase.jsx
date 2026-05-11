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
		navigateToManualStep,
		navigateToCandidateDecision,
		navigateToDefaultAndClearSearch,
		onSnapStateChange,
		clearManualDrop,
		setManualDropQuery,
		manualDropQuery,
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
		navigateToConfirm,
		navigateToCandidateDecision,
		navigateToSaveCategory,
		navigateToSaveDetails,
		navigateToSavedManage,
		navigateToDefaultAndClearSearch,
		replaceNavigationStack,
		onSnapStateChange,
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
			? `Manual Entry - Step ${manualStepIndex + 1} of ${MANUAL_LOCATION_STEPS.length}`
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
		{/* CountryPickerModal removed - country selection is now inline in ManualStepActiveField */}
		</>
	);
}
