import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
	isSidebarMapVariant,
} from "../../core/mapViewportConfig";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapHospitalListContent from "../../surfaces/hospitals/MapHospitalListContent";
import { styles as listStyles } from "../../surfaces/hospitals/mapHospitalList.styles";
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
	const { width } = useWindowDimensions();
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
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
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
	const listTopSlot = (
		<View style={styles.headerRow}>
			<View style={styles.headerCopy}>
				<Text style={[styles.title, { color: titleColor }]}>Hospitals</Text>
			</View>
			<Pressable
				onPress={onClose}
				accessibilityRole="button"
				accessibilityLabel="Close hospitals"
				style={[
					styles.closeButton,
					{
						backgroundColor: isDarkMode
							? "rgba(255,255,255,0.08)"
							: "rgba(15,23,42,0.05)",
					},
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
				ref={bodyScrollRef}
				style={styles.bodyScrollViewport}
				contentContainerStyle={[styles.bodyScrollContent, listStyles.content]}
				showsVerticalScrollIndicator={false}
				nestedScrollEnabled
				bounces={!isSidebarPresentation}
				alwaysBounceVertical={!isSidebarPresentation}
				overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
				directionalLockEnabled
				scrollEventThrottle={16}
				onWheel={handleBodyWheel}
				onScrollBeginDrag={handleBodyScrollBeginDrag}
				onScroll={handleBodyScroll}
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
