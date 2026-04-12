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
import MapSearchSheetSections from "../../surfaces/search/MapSearchSheetSections";
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
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;
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

	const handleSnapToggle = (nextState) => {
		if (!nextState || nextState !== MAP_SHEET_SNAP_STATES.EXPANDED) {
			onClose?.();
			return;
		}
		if (typeof onSnapStateChange !== "function") return;
		onSnapStateChange(nextState);
	};

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			topSlot={null}
			onHandlePress={handleSnapToggle}
		>
			{isExpanded ? (
				<ScrollView
					style={styles.bodyScrollViewport}
					contentContainerStyle={styles.bodyScrollContent}
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
				>
					<View style={styles.activeSearchRow}>
						<EmergencySearchBar
							value={model.query}
							onChangeText={model.setSearchQuery}
							onBlur={() => model.commitQuery(model.query)}
							onClear={() => model.setSearchQuery("")}
							placeholder="Search hospitals, specialties, or area"
							showSuggestions={false}
							autoFocus
							style={[searchStyles.searchBar, styles.activeSearchBar]}
						/>
						<Pressable
							onPressIn={model.handleDismiss}
							hitSlop={10}
							style={[
								styles.closeButton,
								model.isDismissing && styles.closeButtonDisabled,
								{ backgroundColor: model.groupedSurface },
							]}
						>
							<Ionicons name="close" size={20} color={model.titleColor} />
						</Pressable>
					</View>

					<View style={searchStyles.content}>
						<MapSearchSheetSections model={model} />
					</View>
				</ScrollView>
			) : null}
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
