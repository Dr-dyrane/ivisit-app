import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapHospitalListContent from "../../surfaces/hospitals/MapHospitalListContent";
import { styles as listStyles } from "../../surfaces/hospitals/mapHospitalList.styles";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import styles from "./mapHospitalListStage.styles";

export default function MapHospitalListStageBase({
	sheetHeight,
	snapState,
	hospitals = [],
	selectedHospitalId = null,
	recommendedHospitalId = null,
	onClose,
	onSelectHospital,
	onChangeLocation,
	onSnapStateChange,
	isLoading = false,
}) {
	const { isDarkMode } = useTheme();
	const { isSidebarPresentation, centerContent, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const titleColor = tokens.titleColor;
	const closeSurfaceColor = tokens.searchSurface;
	const allowedSnapStates = useMemo(
		() => [MAP_SHEET_SNAP_STATES.HALF, MAP_SHEET_SNAP_STATES.EXPANDED],
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
		androidCollapseHandlers,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const listTopSlot = (
		<View
			style={[
				styles.headerRow,
				centerContent && contentMaxWidth ? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" } : null,
			]}
		>
			<View style={styles.headerCopy}>
				<Text style={[styles.title, { color: titleColor }]}>Hospitals</Text>
			</View>
			<Pressable
				onPress={onClose}
				accessibilityRole="button"
				accessibilityLabel="Close hospitals"
				style={[
					styles.closeButton,
					{ backgroundColor: closeSurfaceColor },
				]}
			>
				<Ionicons name="close" size={20} color={titleColor} />
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
			topSlot={listTopSlot}
			onHandlePress={handleSnapToggle}
		>
			<ScrollView
				{...androidCollapseHandlers}
				ref={bodyScrollRef}
				style={sheetStageStyles.bodyScrollViewport}
				contentContainerStyle={[
					sheetStageStyles.bodyScrollContent,
					sheetStageStyles.bodyScrollContentSheet,
					presentationMode === "modal" ? sheetStageStyles.bodyScrollContentModal : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentPanel : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentSidebar : null,
					centerContent && contentMaxWidth
						? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
						: null,
					styles.bodyScrollContent,
					listStyles.content,
				]}
				showsVerticalScrollIndicator={false}
				nestedScrollEnabled
				bounces={!isSidebarPresentation}
				alwaysBounceVertical={!isSidebarPresentation}
				overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
				directionalLockEnabled
				scrollEventThrottle={16}
				onWheel={handleBodyWheel}
				onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
				onScroll={handleAndroidCollapseScroll}
				onScrollEndDrag={handleBodyScrollEndDrag}
				onMomentumScrollEnd={handleBodyScrollEndDrag}
				scrollEnabled={bodyScrollEnabled}
			>
				<MapHospitalListContent
					hospitals={hospitals}
					selectedHospitalId={selectedHospitalId}
					recommendedHospitalId={recommendedHospitalId}
					onSelectHospital={onSelectHospital}
					onChangeLocation={onChangeLocation}
					isLoading={isLoading}
				/>
			</ScrollView>
		</MapSheetShell>
	);
}
