import React, { useMemo } from "react";
import { BlurView } from "expo-blur";
import { View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getMapSheetHeight, MAP_SHEET_SNAP_STATES } from "./MapSheetOrchestrator";
import { getMapSheetTokens } from "./mapSheetTokens";
import { styles } from "./mapExploreLoadingOverlay.styles";

export default function MapExploreLoadingOverlay({
	screenHeight,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
}) {
	const { isDarkMode } = useTheme();
	const sheetHeight = useMemo(
		() => getMapSheetHeight(screenHeight, snapState),
		[screenHeight, snapState],
	);
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const roadColor = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
	const pinColor = isDarkMode ? "rgba(248,250,252,0.16)" : "rgba(134,16,14,0.14)";
	const ghostSurface = isDarkMode ? "rgba(8,15,27,0.84)" : "rgba(248,250,252,0.84)";
	const ghostCard = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
	const lineColor = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";

	return (
		<View pointerEvents="auto" style={styles.root}>
			<View
				style={[
					styles.backdrop,
					{ backgroundColor: isDarkMode ? "#08101B" : "#EEF3F8" },
				]}
			/>

			<View style={[styles.mapLanePrimary, { backgroundColor: roadColor }]} />
			<View style={[styles.mapLaneSecondary, { backgroundColor: roadColor }]} />
			<View style={[styles.mapLaneTertiary, { backgroundColor: roadColor }]} />
			<View style={[styles.mapPinGhost, styles.mapPinUser, { backgroundColor: pinColor }]} />
			<View style={[styles.mapPinGhost, styles.mapPinHospital, { backgroundColor: pinColor }]} />
			<View style={[styles.mapPinGhost, styles.mapPinHospitalAlt, { backgroundColor: pinColor }]} />

			<BlurView
				intensity={isDarkMode ? 44 : 56}
				tint={isDarkMode ? "dark" : "light"}
				style={[styles.headerGhost, { backgroundColor: ghostSurface }]}
			>
				<View style={[styles.headerButtonGhost, { backgroundColor: ghostCard }]} />
				<View style={styles.headerCopy}>
					<View style={[styles.headerLinePrimary, { backgroundColor: lineColor }]} />
					<View style={[styles.headerLineSecondary, { backgroundColor: lineColor }]} />
				</View>
				<View style={[styles.headerButtonGhost, { backgroundColor: ghostCard }]} />
			</BlurView>

			<BlurView
				intensity={isDarkMode ? 44 : 56}
				tint={isDarkMode ? "dark" : "light"}
				style={[
					styles.sheetGhost,
					{
						backgroundColor: ghostSurface,
						height: sheetHeight,
					},
				]}
			>
				<View style={[styles.handle, { backgroundColor: tokens.handleColor }]} />
				<View style={[styles.searchRow, { backgroundColor: ghostCard }]} />
				<View style={[styles.hospitalCard, { backgroundColor: ghostCard }]} />
				<View style={[styles.sectionLabel, { backgroundColor: lineColor }]} />

				<View style={styles.careRow}>
					{Array.from({ length: 3 }).map((_, index) => (
						<View key={`care-ghost-${index}`} style={styles.careItem}>
							<View style={[styles.careOrb, { backgroundColor: ghostCard }]} />
							<View style={[styles.careLinePrimary, { backgroundColor: lineColor }]} />
							<View style={[styles.careLineSecondary, { backgroundColor: lineColor }]} />
						</View>
					))}
				</View>
			</BlurView>
		</View>
	);
}
