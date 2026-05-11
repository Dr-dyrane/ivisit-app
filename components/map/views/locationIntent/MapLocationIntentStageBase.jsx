import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import buildMapLocationIntentModel from "./mapLocationIntent.model";
import { MANUAL_LOCATION_STEPS } from "./mapLocationIntent.model";
import { mapSuggestionToLocation } from "../../surfaces/search/mapSearchSheet.helpers";
import buildLocationIntentThemeTokens from "./mapLocationIntent.theme";
import {
	buildManualAddressLabel,
	buildManualAddressParts,
	buildLocationIntentRecents,
	buildLocationIntentSavedPlaces,
	getManualStepActionLabel,
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
	const [countryPickerVisible, setCountryPickerVisible] = useState(false);
	const [pendingPlaceLabel, setPendingPlaceLabel] = useState(null);
	const [savedPlaceFeedback, setSavedPlaceFeedback] = useState(null);
	const savedLocations = useLocationStore((state) => state.savedLocations || []);
	const addSavedLocation = useLocationStore((state) => state.addSavedLocation);
	const updateSavedLocation = useLocationStore((state) => state.updateSavedLocation);
	const resetTransientStateForDefault = useCallback(() => {
		setManualError(null);
		setManualStepIndex(0);
		setPendingPlaceLabel(null);
		setSavedPlaceFeedback(null);
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
		returnToDefault: navigateToDefault,
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

	const activeHeaderToggleHandler = isSearchMode
		? navigateToDefaultAndClearSearch
		: handleHeaderToggle;
	const activeHeaderCloseHandler = isSearchMode
		? navigateToDefaultAndClearSearch
		: onClose;
	const activeHeaderToggleIconName = isSearchMode
		? "chevron-back"
		: isExpanded
			? "chevron-down"
			: "chevron-up";
	const activeHeaderToggleAccessibilityLabel = isSearchMode
		? "Back to location choices"
		: isExpanded
			? "Collapse location sheet"
			: "Expand location sheet";
	const activeHeaderCloseAccessibilityLabel = isSearchMode
		? "Close search"
		: "Close location sheet";
	const shouldShowActiveHeaderToggle = isSearchMode || shouldShowHeaderToggle;

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
			if (nextSelection.source === "manual" || nextSelection.source === "search") {
				addSavedLocation?.({
					label: nextSelection.source === "manual" ? "custom" : "recent",
					category: nextSelection.source === "manual" ? "custom" : "recent",
					address: nextSelection.address,
					latitude: nextSelection.coords.latitude,
					longitude: nextSelection.coords.longitude,
					countryCode: nextSelection.countryCode || null,
					unit: nextSelection.unit || null,
					responderNote: nextSelection.responderNote || null,
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
		setManualDraft((prev) => ({ ...prev, [key]: value }));
		setManualError(null);
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

	const handleSaveSelectedLocationAs = useCallback(
		(label) => {
			if (!selectedLocation || !label) return;
			const normalizedLabel = String(label).trim().toLowerCase();
			const shouldUpdateCategorySlot =
				normalizedLabel === "home" || normalizedLabel === "work";
			const displayLabel =
				normalizedLabel === "other"
					? selectedLocation.label || selectedLocation.address || "Saved place"
					: label;
			const savedPayload = mapCandidateToSavedAddressPayload(selectedLocation, {
				label: displayLabel,
				category: normalizedLabel,
			});
			if (!savedPayload) return;
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
				return;
			}
			addSavedLocation?.(savedPayload);
			setSavedPlaceFeedback(label);
		},
		[addSavedLocation, savedLocations, selectedLocation, updateSavedLocation],
	);

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
							setPendingPlaceLabel(null);
							const normalized = buildSelectedLocation(candidate);
							if (!normalized) return;
							setSelectedLocation(normalized);
							navigateToConfirm();
						}}
						onSelectRecentLocation={(recent) => {
							const candidate = mapStoredLocationToCandidate(recent, recent.label || "Recent pickup");
							if (!candidate) return;
							setPendingPlaceLabel(null);
							const normalized = buildSelectedLocation({
								...candidate,
								source: "recent",
								confidence: "medium",
							});
							if (!normalized) return;
							setSelectedLocation(normalized);
							navigateToConfirm();
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
						recents={recents}
						savedPlaces={savedPlaces}
						mode={mode}
						manualDraft={manualDraft}
						onManualDraftChange={handleManualDraftChange}
						onNextManualStep={handleNextManualStep}
						onPrevManualStep={handlePrevManualStep}
						onBackToDefault={navigateToDefaultAndClearSearch}
						onOpenCountryPicker={() => setCountryPickerVisible(true)}
						manualError={manualError}
						manualNextActionLabel={manualNextActionLabel}
						isResolvingManual={isResolvingManual}
						savedPlaceFeedback={savedPlaceFeedback}
						manualStepIndex={manualStepIndex}
						isExpanded={isExpanded}
						isDarkMode={isDarkMode}
						responsiveMetrics={responsiveMetrics}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
		<CountryPickerModal
			visible={countryPickerVisible}
			onClose={() => setCountryPickerVisible(false)}
			onSelect={handleManualCountrySelect}
			selectedCode={manualDraft.countryCode}
			title="Country or region"
			searchPlaceholder="Search country or region"
		/>
		</>
	);
}
