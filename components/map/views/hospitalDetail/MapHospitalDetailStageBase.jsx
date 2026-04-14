import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import useMapHospitalDetailModel from "../../surfaces/hospitals/useMapHospitalDetailModel";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import {
	MapHospitalDetailBodyContent,
	MapHospitalDetailCollapsedTopSlot,
	MapHospitalDetailFloatingTopSlot,
} from "./MapHospitalDetailStageParts";
import styles from "./mapHospitalDetailStage.styles";

const FLOATING_TITLE_REVEAL_DELAY = 160;

export default function MapHospitalDetailStageBase({
	sheetHeight,
	snapState,
	hospital,
	origin = null,
	onClose,
	onOpenHospitals,
	onUseHospital,
	onCycleHospital,
	onOpenServiceDetail,
	onSelectService,
	serviceSelections = null,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const model = useMapHospitalDetailModel({
		visible: true,
		hospital,
		origin,
		onClose,
		onOpenHospitals,
		onUseHospital,
	});
	const [showFloatingTitle, setShowFloatingTitle] = useState(false);
	const [expandedHeaderBottom, setExpandedHeaderBottom] = useState(null);
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isHalf = snapState === MAP_SHEET_SNAP_STATES.HALF;
	const currentSelections = serviceSelections || {
		ambulanceServiceId: null,
		roomServiceId: null,
	};
	const titleColor = model.titleColor;
	const mutedColor = model.subtleColor;
	const closeSurfaceColor = isDarkMode
		? "rgba(148,163,184,0.14)"
		: "rgba(255,255,255,0.42)";
	const iconSurfaceColor = closeSurfaceColor;
	const shouldShowFloatingTitle =
		isHalf || (snapState === MAP_SHEET_SNAP_STATES.EXPANDED && showFloatingTitle);
	const isHeroTopPresentation =
		snapState === MAP_SHEET_SNAP_STATES.EXPANDED && !showFloatingTitle;
	const canCycleHospital = isHalf && typeof onCycleHospital === "function";
	const floatingTitleColor = titleColor;
	const floatingCloseIconColor = isHeroTopPresentation ? "#F8FAFC" : titleColor;
	const floatingCycleIconColor = isDarkMode
		? "rgba(248,250,252,0.92)"
		: "rgba(15,23,42,0.86)";
	const floatingCloseSurface = isHeroTopPresentation
		? "rgba(15,23,42,0.24)"
		: closeSurfaceColor;
	const floatingCycleSurface = isDarkMode
		? "rgba(255,255,255,0.10)"
		: "rgba(255,255,255,0.72)";
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
			setShowFloatingTitle(false);
		},
	});
	const handleHospitalScroll = useCallback(
		(event) => {
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			const nextShowTitle =
				snapState === MAP_SHEET_SNAP_STATES.EXPANDED &&
				offsetY > ((expandedHeaderBottom ?? 88) + FLOATING_TITLE_REVEAL_DELAY);
			setShowFloatingTitle((current) => (current === nextShowTitle ? current : nextShowTitle));
		},
		[expandedHeaderBottom, snapState],
	);

	const handleHospitalScrollBeginDrag = useCallback(
		(event) => {
			handleAndroidCollapseScrollBeginDrag(event);
		},
		[handleAndroidCollapseScrollBeginDrag],
	);

	const handleExpandedHeaderLayout = useCallback((event) => {
		const { y = 0, height = 0 } = event?.nativeEvent?.layout || {};
		const nextBottom = y + height;
		setExpandedHeaderBottom((current) => (current === nextBottom ? current : nextBottom));
	}, []);

	const handleOpenServiceDetails = useCallback(
		(item, serviceType) => {
			if (!hospital || !item || typeof onOpenServiceDetail !== "function") return;
			const serviceItems =
				serviceType === "room"
					? model.roomServiceCards
					: model.ambulanceServiceCards;
			onOpenServiceDetail({
				hospital,
				service: item,
				serviceType,
				serviceItems: serviceItems.filter(
					(entry) => !entry?.isSkeleton && entry?.enabled !== false,
				),
			});
		},
		[hospital, model.ambulanceServiceCards, model.roomServiceCards, onOpenServiceDetail],
	);

	const handleSelectAmbulanceServiceId = useCallback(
		(value) => {
			if (!hospital?.id) return;
			onSelectService?.(hospital.id, "ambulanceServiceId", value);
		},
		[hospital?.id, onSelectService],
	);

	const handleSelectRoomServiceId = useCallback(
		(value) => {
			if (!hospital?.id) return;
			onSelectService?.(hospital.id, "roomServiceId", value);
		},
		[hospital?.id, onSelectService],
	);

	useEffect(() => {
		if (snapState !== MAP_SHEET_SNAP_STATES.EXPANDED && showFloatingTitle) {
			setShowFloatingTitle(false);
		}
	}, [showFloatingTitle, snapState]);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				isCollapsed ? (
					<MapHospitalDetailCollapsedTopSlot
						model={model}
						onExpand={() => onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF)}
						onClose={onClose}
						titleColor={titleColor}
						mutedColor={mutedColor}
						iconSurfaceColor={iconSurfaceColor}
					/>
				) : (
					<MapHospitalDetailFloatingTopSlot
						modalContainedStyle={modalContainedStyle}
						contentMaxWidth={contentMaxWidth}
						canCycleHospital={canCycleHospital}
						onCycleHospital={onCycleHospital}
						floatingCycleSurface={floatingCycleSurface}
						floatingCycleIconColor={floatingCycleIconColor}
						shouldShowFloatingTitle={shouldShowFloatingTitle}
						floatingTitleColor={floatingTitleColor}
						title={model.summary.title}
						subtitle={isHalf ? model.summary.contextLine : null}
						mutedColor={mutedColor}
						onClose={onClose}
						floatingCloseSurface={floatingCloseSurface}
						floatingCloseIconColor={floatingCloseIconColor}
					/>
				)
			}
			handleFloatsOverContent={!isCollapsed}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
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
					onScrollBeginDrag={handleHospitalScrollBeginDrag}
					onScroll={(event) => {
						handleAndroidCollapseScroll(event);
						handleHospitalScroll(event);
					}}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
				>
					<MapHospitalDetailBodyContent
						model={model}
						revealHero={snapState === MAP_SHEET_SNAP_STATES.EXPANDED}
						onExpandedHeaderLayout={handleExpandedHeaderLayout}
						onCycleHospital={onCycleHospital}
						selectedAmbulanceServiceId={currentSelections.ambulanceServiceId}
						selectedRoomServiceId={currentSelections.roomServiceId}
						onSelectAmbulanceServiceId={handleSelectAmbulanceServiceId}
						onSelectRoomServiceId={handleSelectRoomServiceId}
						onOpenServiceDetails={handleOpenServiceDetails}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
	);
}
