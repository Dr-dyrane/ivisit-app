import React, { useCallback, useMemo, useState } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import {
	MapLocationIntentActiveTopRow,
	MapLocationIntentBodyContent,
	MapLocationIntentCollapsedTopRow,
	getMapLocationIntentStageResponsiveStyles,
} from "./MapLocationIntentStageParts";

export default function MapLocationIntentStageBase({
	sheetHeight,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	onClose,
	onOpenSearch,
	onOpenProfile,
	currentLocation,
}) {
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const responsiveStyles = useMemo(
		() => getMapLocationIntentStageResponsiveStyles(presentationMode, contentMaxWidth),
		[presentationMode, contentMaxWidth],
	);
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const shouldShowHeaderToggle = presentationMode === "sheet";
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const closeSurfaceColor = isDarkMode
		? "rgba(148,163,184,0.14)"
		: "rgba(255,255,255,0.42)";
	const allowedSnapStates = [
		MAP_SHEET_SNAP_STATES.COLLAPSED,
		MAP_SHEET_SNAP_STATES.HALF,
	];

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
		snapState,
		allowedSnapStates,
		onSnapStateChange: () => {},
	});

	const {
		handleAndroidExpandedCollapse,
		shouldLockExpandedForAndroid,
	} = useMapAndroidExpandedCollapse({
		snapState,
		allowedSnapStates,
		onSnapStateChange: () => {},
	});

	const handleExpand = useCallback(() => {
		// For now, just log - snap toggle will be handled by MapSheetShell
		console.log("Location sheet expand tapped");
	}, []);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			handleFloatsOverContent={shouldShowHeaderToggle}
			bodyGestureEnabled={!shouldLockExpandedForAndroid}
			onHandlePress={() => {}}
			topSlot={
				isCollapsed ? (
					<MapLocationIntentCollapsedTopRow
						responsiveStyles={responsiveStyles}
						modalContainedStyle={modalContainedStyle}
						tokens={tokens}
						onExpand={handleExpand}
						onClose={onClose}
						currentLocation={currentLocation}
						isDarkMode={isDarkMode}
					/>
				) : (
					<MapLocationIntentActiveTopRow
						responsiveStyles={responsiveStyles}
						modalContainedStyle={modalContainedStyle}
						tokens={tokens}
						onClose={onClose}
						currentLocation={currentLocation}
						isDarkMode={isDarkMode}
					/>
				)
			}
		>
			<MapStageBodyScroll
				ref={bodyScrollRef}
				style={sheetStageStyles.bodyScroll}
				contentContainerStyle={sheetStageStyles.bodyScrollContent}
				showsVerticalScrollIndicator={false}
				enabled={bodyScrollEnabled}
				onScroll={handleBodyScroll}
				onScrollBeginDrag={handleBodyScrollBeginDrag}
				onScrollEndDrag={handleBodyScrollEndDrag}
				onWheel={handleBodyWheel}
				snapToOffsets={allowScrollDetents ? [0] : undefined}
			>
				<MapLocationIntentBodyContent
					responsiveStyles={responsiveStyles}
					tokens={tokens}
					onOpenSearch={onOpenSearch}
					onOpenProfile={onOpenProfile}
					isDarkMode={isDarkMode}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
