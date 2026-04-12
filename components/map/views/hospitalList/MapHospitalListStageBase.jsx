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
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	const handleSnapToggle = (nextState) => {
		if (typeof onSnapStateChange !== "function") return;
		if (nextState === MAP_SHEET_SNAP_STATES.COLLAPSED) {
			onClose?.();
			onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
			return;
		}
		if (nextState) {
			onSnapStateChange(nextState);
			return;
		}
		if (snapState === MAP_SHEET_SNAP_STATES.HALF) {
			onSnapStateChange(MAP_SHEET_SNAP_STATES.EXPANDED);
			return;
		}
		onSnapStateChange(MAP_SHEET_SNAP_STATES.HALF);
	};

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			onHandlePress={handleSnapToggle}
		>
			<ScrollView
				style={styles.bodyScrollViewport}
				contentContainerStyle={[styles.bodyScrollContent, listStyles.content]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
			>
				<View style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text style={[styles.eyebrow, { color: mutedColor }]}>Nearby now</Text>
						<Text style={[styles.title, { color: titleColor }]}>Hospitals</Text>
						<Text style={[styles.subtitle, { color: mutedColor }]}>
							Choose the best nearby hospital for this route.
						</Text>
					</View>
					<Pressable
						onPress={onClose}
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
