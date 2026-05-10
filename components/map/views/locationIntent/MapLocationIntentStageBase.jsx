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
import buildMapLocationIntentModel from "./mapLocationIntent.model";
import {
	LOCATION_INTENT_MODES,
	MANUAL_LOCATION_STEPS,
} from "./mapLocationIntent.model";
import buildLocationIntentThemeTokens from "./mapLocationIntent.theme";
import mapboxService from "../../../../services/mapboxService";
import { useLocationStore } from "../../../../stores/locationStore";
import {
	MapLocationIntentActiveTopRow,
	MapLocationIntentBodyContent,
	MapLocationIntentCollapsedTopRow,
} from "./MapLocationIntentStageParts";
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
	const [mode, setMode] = useState(LOCATION_INTENT_MODES.DEFAULT);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [manualStepIndex, setManualStepIndex] = useState(0);
	const [manualDraft, setManualDraft] = useState({
		country: "",
		stateRegion: "",
		city: "",
		streetAddress: "",
		unit: "",
		responderNote: "",
	});
	const [selectedLocation, setSelectedLocation] = useState(null);
	const savedLocations = useLocationStore((state) => state.savedLocations || []);
	const addSavedLocation = useLocationStore((state) => state.addSavedLocation);

	useEffect(() => {
		const seededQuery =
			typeof sheetPayload?.addressQuery === "string"
				? sheetPayload.addressQuery.trim()
				: "";
		if (seededQuery) {
			setSearchQuery(seededQuery);
			setMode(LOCATION_INTENT_MODES.ADDRESS_SEARCH);
		}
	}, [sheetPayload?.addressQuery]);

	const model = useMemo(
		() =>
			buildMapLocationIntentModel({
				currentLocation,
				locationControl,
				mode,
			}),
		[currentLocation, locationControl, mode],
	);

	useEffect(() => {
		let active = true;
		const run = async () => {
			if (mode !== LOCATION_INTENT_MODES.ADDRESS_SEARCH) return;
			const query = searchQuery.trim();
			if (query.length < 2) {
				setSearchResults([]);
				return;
			}
			const suggestions = await mapboxService.suggestAddresses(
				query,
				currentLocation?.location || currentLocation || null,
			);
			if (!active) return;
			setSearchResults(Array.isArray(suggestions) ? suggestions : []);
		};
		run();
		return () => {
			active = false;
		};
	}, [currentLocation, mode, searchQuery]);
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

	const buildSelectedLocation = useCallback(
		(payload) => ({
			source: payload?.source || "manual",
			label: payload?.label || payload?.primaryText || "Selected location",
			address:
				payload?.address ||
				payload?.formattedAddress ||
				payload?.secondaryText ||
				payload?.label ||
				"",
			coords: {
				latitude: Number(
					payload?.coords?.latitude ??
						payload?.location?.latitude ??
						payload?.latitude ??
						currentLocation?.location?.latitude ??
						currentLocation?.latitude ??
						0,
				),
				longitude: Number(
					payload?.coords?.longitude ??
						payload?.location?.longitude ??
						payload?.longitude ??
						currentLocation?.location?.longitude ??
						currentLocation?.longitude ??
						0,
				),
			},
			confidence: payload?.confidence || "medium",
			unit: payload?.unit || manualDraft.unit || undefined,
			responderNote: payload?.responderNote || manualDraft.responderNote || undefined,
			countryCode:
				payload?.countryCode ||
				locationControl?.currentCountryCode ||
				undefined,
		}),
		[currentLocation, locationControl?.currentCountryCode, manualDraft.responderNote, manualDraft.unit],
	);

	const commitLocation = useCallback(
		(nextSelection) => {
			if (!nextSelection) return;
			onSelectLocation?.({
				primaryText: nextSelection.label,
				secondaryText: nextSelection.address,
				formattedAddress: nextSelection.address,
				location: {
					latitude: nextSelection.coords.latitude,
					longitude: nextSelection.coords.longitude,
				},
				countryCode: nextSelection.countryCode || null,
				source: nextSelection.source,
			});
			if (nextSelection.source === "manual" || nextSelection.source === "search") {
				addSavedLocation?.({
					label: nextSelection.source === "manual" ? "custom" : "recent",
					address: nextSelection.address,
					latitude: nextSelection.coords.latitude,
					longitude: nextSelection.coords.longitude,
					countryCode: nextSelection.countryCode || null,
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
		setSelectedLocation(normalized);
		setMode(LOCATION_INTENT_MODES.CONFIRM);
	}, [
		buildSelectedLocation,
		currentLocation,
		model.requiresLocationSelection,
		model.shouldOpenSettings,
		onUseCurrentLocation,
	]);

	const recents = useMemo(
		() =>
			savedLocations
				.slice(0, 5)
				.map((item) => ({
					label: item?.label || "Recent",
					address: item?.address || "",
					latitude: item?.latitude,
					longitude: item?.longitude,
					countryCode: item?.countryCode || null,
				})),
		[savedLocations],
	);
	const savedPlaces = useMemo(
		() => [
			{ key: "home", label: "Home", hasLocation: false },
			{ key: "work", label: "Work", hasLocation: false },
			{ key: "add", label: "Add", hasLocation: false },
		],
		[],
	);

		return (
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
							onToggle={handleHeaderToggle}
							toggleAccessibilityLabel={
								isExpanded
									? "Collapse location sheet"
									: "Expand location sheet"
							}
							toggleIconName={isExpanded ? "chevron-down" : "chevron-up"}
							onClose={onClose}
							showToggle={shouldShowHeaderToggle}
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
						onOpenSearch={() => setMode(LOCATION_INTENT_MODES.ADDRESS_SEARCH)}
						onSelectSavedPlace={(place) => {
							const matched = savedLocations.find(
								(item) => String(item?.label || "").toLowerCase() === place.key,
							);
							if (!matched) {
								setManualStepIndex(0);
								setMode(LOCATION_INTENT_MODES.MANUAL_STEP);
								return;
							}
							const normalized = buildSelectedLocation({
								source: "saved",
								label: place.label,
								address: matched.address,
								coords: {
									latitude: matched.latitude,
									longitude: matched.longitude,
								},
								countryCode: matched.countryCode,
								confidence: "high",
							});
							setSelectedLocation(normalized);
							setMode(LOCATION_INTENT_MODES.CONFIRM);
						}}
						onSelectRecentLocation={(recent) => {
							const normalized = buildSelectedLocation({
								source: "recent",
								label: recent.label || "Recent location",
								address: recent.address,
								coords: {
									latitude: recent.latitude,
									longitude: recent.longitude,
								},
								countryCode: recent.countryCode,
								confidence: "medium",
							});
							setSelectedLocation(normalized);
							setMode(LOCATION_INTENT_MODES.CONFIRM);
						}}
						onOpenManualIntro={() => {
							setManualStepIndex(0);
							setMode(LOCATION_INTENT_MODES.MANUAL_STEP);
						}}
						onStartPinAdjust={() => {
							const pinSelection = buildSelectedLocation({
								source: "pin",
								label: "Pin-adjusted location",
								address: currentLocation?.formattedAddress || model.headerSubtitle,
								confidence: "medium",
							});
							setSelectedLocation(pinSelection);
							setMode(LOCATION_INTENT_MODES.PIN_ADJUST);
						}}
						onConfirmSelection={() => commitLocation(selectedLocation)}
						searchQuery={searchQuery}
						onSearchQueryChange={(value) => {
							setSearchQuery(value);
							setMode(LOCATION_INTENT_MODES.ADDRESS_SEARCH);
						}}
						searchResults={searchResults}
						selectedLocation={selectedLocation}
						onPickSearchResult={(item) => {
							const normalized = buildSelectedLocation({
								source: "search",
								label: item.primaryText || "Selected place",
								address: item.formattedAddress || item.secondaryText || "",
								coords: item.location,
								countryCode: item.countryCode || null,
								confidence: "high",
							});
							setSelectedLocation(normalized);
							setMode(LOCATION_INTENT_MODES.PLACE_SELECTED);
						}}
						recents={recents}
						savedPlaces={savedPlaces}
						mode={mode}
						manualDraft={manualDraft}
						onManualDraftChange={(key, value) =>
							setManualDraft((prev) => ({ ...prev, [key]: value }))
						}
						onNextManualStep={() => {
							if (mode === LOCATION_INTENT_MODES.MANUAL_INTRO) {
								setMode(LOCATION_INTENT_MODES.MANUAL_STEP);
								setManualStepIndex(0);
								return;
							}
							if (manualStepIndex >= MANUAL_LOCATION_STEPS.length - 1) {
								const label = manualDraft.streetAddress || manualDraft.city || "Manual location";
								const address = [
									manualDraft.streetAddress,
									manualDraft.city,
									manualDraft.stateRegion,
									manualDraft.country,
								]
									.filter(Boolean)
									.join(", ");
								const normalized = buildSelectedLocation({
									source: "manual",
									label,
									address,
									confidence: "low",
								});
								setSelectedLocation(normalized);
								setMode(LOCATION_INTENT_MODES.CONFIRM);
								return;
							}
							setManualStepIndex((prev) =>
								Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1),
							);
						}}
						onPrevManualStep={() => {
							if (mode === LOCATION_INTENT_MODES.MANUAL_INTRO) {
								setMode(LOCATION_INTENT_MODES.DEFAULT);
								return;
							}
							if (manualStepIndex <= 0) {
								setMode(LOCATION_INTENT_MODES.DEFAULT);
								return;
							}
							setManualStepIndex((prev) => Math.max(0, prev - 1));
						}}
						onBackToDefault={() => {
							setMode(LOCATION_INTENT_MODES.DEFAULT);
							setManualStepIndex(0);
						}}
						manualStepIndex={manualStepIndex}
						isExpanded={isExpanded}
						isDarkMode={isDarkMode}
						responsiveMetrics={responsiveMetrics}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
	);
}
