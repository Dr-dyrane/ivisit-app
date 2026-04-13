import React, { useMemo } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SearchBoundary } from "../../../../contexts/SearchContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapSearchSheetSections from "../../surfaces/search/MapSearchSheetSections";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import MapExploreIntentProfileTrigger from "../exploreIntent/MapExploreIntentProfileTrigger";
import useMapSearchSheetModel from "../../surfaces/search/useMapSearchSheetModel";
import { styles as searchStyles } from "../../surfaces/search/mapSearchSheet.styles";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import { GestureDetector } from "react-native-gesture-handler";
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
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
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
	const {
		androidExpandedBodyGesture,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
		onExpandedToHalf: () => {
			Keyboard.dismiss();
		},
	});
	const collapsedTopRow = (
		<View
			style={[
				styles.topRow,
				styles.topRowCollapsed,
				modalContainedStyle,
			]}
		>
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
		<View
			style={[
				styles.topRow,
				modalContainedStyle,
			]}
		>
			<EmergencySearchBar
				value={model.query}
				onChangeText={model.setSearchQuery}
				onFocus={() => {
					if (snapState === MAP_SHEET_SNAP_STATES.HALF) {
						handleSnapToggle(MAP_SHEET_SNAP_STATES.EXPANDED);
					}
				}}
				onBlur={() => model.commitQuery(model.query)}
				onClear={() => model.setSearchQuery("")}
				placeholder="Search hospitals, specialties, or area"
				showSuggestions={false}
				autoFocus={false}
				compact
				style={[searchStyles.searchBar, styles.activeSearchBar]}
			/>
			<Pressable
				onPress={model.handleDismiss}
				hitSlop={10}
				style={[
					styles.closeButton,
					model.isDismissing && styles.closeButtonDisabled,
					{ backgroundColor: tokens.searchSurface },
				]}
			>
				<Ionicons name="close" size={18} color={model.titleColor} />
			</Pressable>
		</View>
	);
	const bodyContent = (
		<View style={searchStyles.content}>
			<MapSearchSheetSections model={model} />
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
					style={sheetStageStyles.bodyScrollViewport}
					contentContainerStyle={[
						sheetStageStyles.bodyScrollContent,
						sheetStageStyles.bodyScrollContentSheet,
						presentationMode === "modal" ? sheetStageStyles.bodyScrollContentModal : null,
						isSidebarPresentation ? sheetStageStyles.bodyScrollContentPanel : null,
						isSidebarPresentation ? sheetStageStyles.bodyScrollContentSidebar : null,
						modalContainedStyle,
						styles.bodyScrollContent,
					]}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
					bounces={!isSidebarPresentation}
					alwaysBounceVertical={!isSidebarPresentation}
					overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
					directionalLockEnabled
					onWheel={handleBodyWheel}
					scrollEventThrottle={16}
					onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
					onScroll={handleAndroidCollapseScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					onMomentumScrollEnd={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
				>
					{androidExpandedBodyGesture ? (
						<GestureDetector gesture={androidExpandedBodyGesture}>
							{bodyContent}
						</GestureDetector>
					) : (
						bodyContent
					)}
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
