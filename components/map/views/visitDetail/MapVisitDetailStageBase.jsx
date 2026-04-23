import React, { useCallback, useMemo } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapVisitDetailModel from "../../surfaces/visitDetail/useMapVisitDetailModel";
import {
	MapVisitDetailBodyContent,
	MapVisitDetailFloatingTopSlot,
} from "./MapVisitDetailStageParts";
import styles from "./mapVisitDetailStage.styles";

/**
 * MapVisitDetailStageBase
 *
 * Sheet-phase stage for the VISIT_DETAIL phase. Mirrors MapHospitalListStageBase's
 * minimal two-snap pattern (HALF + EXPANDED) — no collapsed row.
 *
 * Props
 *   - sheetHeight / snapState / onSnapStateChange   standard sheet lifecycle
 *   - historyItem                                    the visit to render
 *   - onClose                                        returns the sheet to EXPLORE_INTENT
 *   - onResume / onRateVisit / onCallClinic /
 *     onJoinVideo / onBookAgain / onOpenPaymentDetails /
 *     onGetDirections /
 *     onCancelVisit                                  action handlers (routed via MapScreen)
 */
export default function MapVisitDetailStageBase({
	sheetHeight,
	snapState,
	historyItem,
	onClose,
	onResume,
	onRateVisit,
	onCallClinic,
	onJoinVideo,
	onBookAgain,
	onOpenPaymentDetails,
	onGetDirections,
	onCancelVisit,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const shouldShowHeaderToggle = presentationMode === "sheet";
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);

	const model = useMapVisitDetailModel({
		historyItem,
		onResume,
		onRateVisit,
		onCallClinic,
		onJoinVideo,
		onBookAgain,
		onOpenPaymentDetails,
		onGetDirections,
	});

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
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const handleHeaderToggle = useCallback(() => {
		if (typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [onSnapStateChange, snapState]);
	const isExpanded =
		presentationMode !== "sheet" ||
		snapState === MAP_SHEET_SNAP_STATES.EXPANDED;

	const titleColor = tokens.titleColor;
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const closeSurfaceColor = isDarkMode
		? "rgba(148,163,184,0.14)"
		: "rgba(255,255,255,0.42)";
	const floatingCloseSurface = closeSurfaceColor;
	const floatingCloseIconColor = titleColor;
	const floatingToggleSurface = isDarkMode
		? "rgba(255,255,255,0.10)"
		: "rgba(255,255,255,0.72)";
	const floatingToggleIconColor = isDarkMode
		? "rgba(248,250,252,0.92)"
		: "rgba(15,23,42,0.86)";

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapVisitDetailFloatingTopSlot
					modalContainedStyle={modalContainedStyle}
					contentMaxWidth={contentMaxWidth}
					showToggle={shouldShowHeaderToggle}
					onToggle={handleHeaderToggle}
					toggleAccessibilityLabel={
						snapState === MAP_SHEET_SNAP_STATES.EXPANDED
							? "Collapse visit sheet"
							: "Expand visit sheet"
					}
					toggleIconName={
						snapState === MAP_SHEET_SNAP_STATES.EXPANDED
							? "chevron-down"
							: "chevron-up"
					}
					floatingToggleSurface={floatingToggleSurface}
					floatingToggleIconColor={floatingToggleIconColor}
					title={model.topSlot?.title || model.hero?.title || null}
					subtitle={model.topSlot?.subtitle || model.hero?.subtitle || null}
					titleColor={titleColor}
					mutedColor={mutedColor}
					onClose={onClose}
					floatingCloseSurface={floatingCloseSurface}
					floatingCloseIconColor={floatingCloseIconColor}
				/>
			}
			handleFloatsOverContent
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
				]}
				isSidebarPresentation={isSidebarPresentation}
				allowScrollDetents={allowScrollDetents}
				handleBodyWheel={handleBodyWheel}
				onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
				onScroll={handleAndroidCollapseScroll}
				onScrollEndDrag={handleBodyScrollEndDrag}
				scrollEnabled={bodyScrollEnabled}
				androidExpandedBodyGesture={androidExpandedBodyGesture}
				androidExpandedBodyStyle={androidExpandedBodyStyle}
			>
				<MapVisitDetailBodyContent
					model={model}
					onCancelVisit={onCancelVisit}
					isExpanded={isExpanded}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
