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
	const [serviceSelectionsByHospital, setServiceSelectionsByHospital] = useState({});
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isHalf = snapState === MAP_SHEET_SNAP_STATES.HALF;
	const hospitalSelectionKey = hospital?.id || "unknown";
	const currentSelections = serviceSelectionsByHospital[hospitalSelectionKey] || {
		ambulanceServiceId: null,
		roomServiceId: null,
	};
	const titleColor = model.titleColor;
	const mutedColor = model.subtleColor;
	const iconSurfaceColor = isDarkMode ? "rgba(15,23,42,0.56)" : "rgba(255,255,255,0.78)";
	const iconBorderColor = isDarkMode ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.92)";
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
		: isDarkMode
			? "rgba(148,163,184,0.14)"
			: "rgba(255,255,255,0.42)";
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

	useEffect(() => {
		const nextAmbulanceIds = model.ambulanceServiceCards
			.filter((item) => !item?.isSkeleton && item?.enabled !== false)
			.map((item, index) => item.id || item.title || `ambulance-${index}`);
		const nextRoomIds = model.roomServiceCards
			.filter((item) => !item?.isSkeleton && item?.enabled !== false)
			.map((item, index) => item.id || item.title || `room-${index}`);

		setServiceSelectionsByHospital((current) => {
			const existing = current[hospitalSelectionKey] || {
				ambulanceServiceId: null,
				roomServiceId: null,
			};
			const nextAmbulanceServiceId =
				existing.ambulanceServiceId && !nextAmbulanceIds.includes(existing.ambulanceServiceId)
					? null
					: existing.ambulanceServiceId;
			const nextRoomServiceId =
				existing.roomServiceId && !nextRoomIds.includes(existing.roomServiceId)
					? null
					: existing.roomServiceId;

			if (
				existing.ambulanceServiceId === nextAmbulanceServiceId &&
				existing.roomServiceId === nextRoomServiceId
			) {
				return current;
			}

			return {
				...current,
				[hospitalSelectionKey]: {
					ambulanceServiceId: nextAmbulanceServiceId,
					roomServiceId: nextRoomServiceId,
				},
			};
		});
	}, [hospitalSelectionKey, model.ambulanceServiceCards, model.roomServiceCards]);

	const setSelectedAmbulanceServiceId = useCallback(
		(value) => {
			setServiceSelectionsByHospital((current) => ({
				...current,
				[hospitalSelectionKey]: {
					...(current[hospitalSelectionKey] || {
						ambulanceServiceId: null,
						roomServiceId: null,
					}),
					ambulanceServiceId: value,
				},
			}));
		},
		[hospitalSelectionKey],
	);

	const setSelectedRoomServiceId = useCallback(
		(value) => {
			setServiceSelectionsByHospital((current) => ({
				...current,
				[hospitalSelectionKey]: {
					...(current[hospitalSelectionKey] || {
						ambulanceServiceId: null,
						roomServiceId: null,
					}),
					roomServiceId: value,
				},
			}));
		},
		[hospitalSelectionKey],
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
						isDarkMode={isDarkMode}
						iconSurfaceColor={iconSurfaceColor}
						iconBorderColor={iconBorderColor}
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
						onSelectAmbulanceServiceId={setSelectedAmbulanceServiceId}
						onSelectRoomServiceId={setSelectedRoomServiceId}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
	);
}
