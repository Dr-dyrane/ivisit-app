import React, { useMemo } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { styles as listStyles } from "../../surfaces/hospitals/mapHospitalList.styles";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import {
	MapHospitalListBodyContent,
	MapHospitalListTopSlot,
} from "./MapHospitalListStageParts";
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
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const titleColor = tokens.titleColor;
	const closeSurfaceColor = tokens.closeSurface;
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
		androidExpandedBodyGesture,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapHospitalListTopSlot
					modalContainedStyle={modalContainedStyle}
					titleColor={titleColor}
					closeSurfaceColor={closeSurfaceColor}
					isDarkMode={isDarkMode}
					onClose={onClose}
				/>
			}
			onHandlePress={handleSnapToggle}
		>
			<MapStageBodyScroll
				bodyScrollRef={bodyScrollRef}
				viewportStyle={sheetStageStyles.bodyScrollViewport}
				contentContainerStyle={[
					sheetStageStyles.bodyScrollContent,
					sheetStageStyles.bodyScrollContentSheet,
					presentationMode === "modal" ? sheetStageStyles.bodyScrollContentModal : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentPanel : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentSidebar : null,
					modalContainedStyle,
					styles.bodyScrollContent,
					listStyles.content,
				]}
				isSidebarPresentation={isSidebarPresentation}
				allowScrollDetents={allowScrollDetents}
				handleBodyWheel={handleBodyWheel}
				onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
				onScroll={handleAndroidCollapseScroll}
				onScrollEndDrag={handleBodyScrollEndDrag}
				scrollEnabled={bodyScrollEnabled}
				androidExpandedBodyGesture={androidExpandedBodyGesture}
			>
				<MapHospitalListBodyContent
					hospitals={hospitals}
					selectedHospitalId={selectedHospitalId}
					recommendedHospitalId={recommendedHospitalId}
					onSelectHospital={onSelectHospital}
					onChangeLocation={onChangeLocation}
					isLoading={isLoading}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
