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
import MapHospitalDetailBody from "../../surfaces/hospitals/MapHospitalDetailBody";
import useMapHospitalDetailModel from "../../surfaces/hospitals/useMapHospitalDetailModel";
import styles from "./mapHospitalDetailStage.styles";

export default function MapHospitalDetailStageBase({
	sheetHeight,
	snapState,
	hospital,
	origin = null,
	onClose,
	onOpenHospitals,
	onUseHospital,
	onSnapStateChange,
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
	const model = useMapHospitalDetailModel({
		visible: true,
		hospital,
		origin,
		onClose,
		onOpenHospitals,
		onUseHospital,
	});
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const titleColor = model.titleColor;
	const mutedColor = model.subtleColor;
	const iconSurfaceColor = isDarkMode ? "rgba(3,10,20,0.72)" : "rgba(15,23,42,0.12)";

	const handleSnapToggle = (nextState) => {
		if (typeof onSnapStateChange !== "function") return;
		if (nextState) {
			onSnapStateChange(nextState);
			return;
		}
		if (snapState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}
		if (snapState === MAP_SHEET_SNAP_STATES.HALF) {
			onSnapStateChange(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}
		onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
	};

	const collapsedTopSlot = (
		<View style={styles.collapsedRow}>
			<Pressable
				onPress={model.collapsedAction.onPress}
				accessibilityLabel={model.collapsedAction.accessibilityLabel}
				style={[styles.collapsedIconButton, { backgroundColor: iconSurfaceColor }]}
			>
				<Ionicons name={model.collapsedAction.icon} size={16} color={titleColor} />
			</Pressable>

			<Pressable
				onPress={() => onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF)}
				style={styles.collapsedSummaryPressable}
			>
				<View style={styles.collapsedSummaryCard}>
					<Text numberOfLines={1} style={[styles.collapsedTitle, { color: titleColor }]}>
						{model.summary.title}
					</Text>
					<Text numberOfLines={1} style={[styles.collapsedSubtitle, { color: mutedColor }]}>
						{model.collapsedDistanceLabel}
					</Text>
				</View>
			</Pressable>

			<Pressable
				onPress={onClose}
				style={[styles.collapsedIconButton, { backgroundColor: iconSurfaceColor }]}
			>
				<Ionicons name="close" size={18} color={titleColor} />
			</Pressable>
		</View>
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			topSlot={isCollapsed ? collapsedTopSlot : null}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
				<ScrollView
					style={styles.bodyScrollViewport}
					contentContainerStyle={styles.bodyScrollContent}
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
				>
					<MapHospitalDetailBody model={model} visible />
				</ScrollView>
			)}
		</MapSheetShell>
	);
}
