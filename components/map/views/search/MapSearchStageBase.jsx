import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SearchBoundary } from "../../../../contexts/SearchContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import MapSheetShell from "../../MapSheetShell";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
	isSidebarMapVariant,
} from "../../core/mapViewportConfig";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapSearchSheetSections from "../../surfaces/search/MapSearchSheetSections";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import MapExploreIntentProfileTrigger from "../exploreIntent/MapExploreIntentProfileTrigger";
import useMapSearchSheetModel from "../../surfaces/search/useMapSearchSheetModel";
import { styles as searchStyles } from "../../surfaces/search/mapSearchSheet.styles";
import styles from "./mapSearchStage.styles";

function MapSearchStageSurface({
	sheetHeight,
	snapState,
	mode,
	hospitals,
	selectedHospitalId,
	currentLocation,
	onClose,
	onOpenHospital,
	onBrowseHospitals,
	onUseCurrentLocation,
	onSelectLocation,
	onOpenProfile,
	onSnapStateChange,
	profileImageSource,
	isSignedIn,
}) {
	const { isDarkMode } = useTheme();
	const { width } = useWindowDimensions();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const viewportVariant = useMemo(
		() => getMapViewportVariant({ platform: Platform.OS, width }),
		[width],
	);
	const surfaceConfig = useMemo(
		() => getMapViewportSurfaceConfig(viewportVariant),
		[viewportVariant],
	);
	const isSidebarPresentation = isSidebarMapVariant(viewportVariant);
	const presentationMode = isSidebarPresentation ? "sidebar" : "sheet";
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const shellWidth = useMemo(
		() =>
			isSidebarPresentation
				? Math.min(
						surfaceConfig.sidebarMaxWidth || Math.max(400, width * 0.36),
						Math.max(320, width - 48),
					)
				: null,
		[isSidebarPresentation, surfaceConfig.sidebarMaxWidth, width],
	);
	const model = useMapSearchSheetModel({
		visible: true,
		mode,
		hospitals,
		selectedHospitalId,
		currentLocation,
		onClose,
		onOpenHospital,
		onBrowseHospitals,
		onUseCurrentLocation,
		onSelectLocation,
	});
	const allowedSnapStates = useMemo(
		() => [
			MAP_SHEET_SNAP_STATES.COLLAPSED,
			MAP_SHEET_SNAP_STATES.HALF,
			MAP_SHEET_SNAP_STATES.EXPANDED,
		],
		[],
	);
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
		snapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
	});
	const collapsedTopRow = (
		<View style={[styles.topRow, styles.topRowCollapsed]}>
			<Pressable
				onPress={() => handleSnapToggle(MAP_SHEET_SNAP_STATES.HALF)}
				style={[
					styles.searchPill,
					styles.searchPillCollapsed,
					{
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={18} color={tokens.titleColor} />
				<Text style={[styles.searchText, { color: tokens.titleColor }]}>Search</Text>
			</Pressable>

			<MapExploreIntentProfileTrigger
				onPress={onOpenProfile}
				userImageSource={profileImageSource}
				isSignedIn={isSignedIn}
				isCollapsed
			/>
		</View>
	);
	const activeTopRow = (
		<View style={styles.topRow}>
			<EmergencySearchBar
				value={model.query}
				onChangeText={model.setSearchQuery}
				onBlur={() => model.commitQuery(model.query)}
				onClear={() => model.setSearchQuery("")}
				placeholder="Search hospitals, specialties, or area"
				showSuggestions={false}
				autoFocus
				compact
				style={[searchStyles.searchBar, styles.activeSearchBar]}
			/>
			<Pressable
				onPress={model.handleDismiss}
				hitSlop={10}
				style={[
					styles.closeButton,
					model.isDismissing && styles.closeButtonDisabled,
					{ backgroundColor: model.groupedSurface },
				]}
			>
				<Ionicons name="close" size={18} color={model.titleColor} />
			</Pressable>
		</View>
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={isCollapsed ? collapsedTopRow : activeTopRow}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
				<ScrollView
					ref={bodyScrollRef}
					style={styles.bodyScrollViewport}
					contentContainerStyle={styles.bodyScrollContent}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
					bounces={!isSidebarPresentation}
					alwaysBounceVertical={!isSidebarPresentation}
					overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
					directionalLockEnabled
					onWheel={handleBodyWheel}
					scrollEventThrottle={16}
					onScrollBeginDrag={handleBodyScrollBeginDrag}
					onScroll={handleBodyScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					onMomentumScrollEnd={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
				>
					<View style={searchStyles.content}>
						<MapSearchSheetSections model={model} />
					</View>
				</ScrollView>
			)}
		</MapSheetShell>
	);
}

export default function MapSearchStageBase(props) {
	return (
		<SearchBoundary>
			<MapSearchStageSurface {...props} />
		</SearchBoundary>
	);
}
