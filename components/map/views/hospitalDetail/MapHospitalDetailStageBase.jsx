import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapHospitalDetailBody from "../../surfaces/hospitals/MapHospitalDetailBody";
import useMapHospitalDetailModel from "../../surfaces/hospitals/useMapHospitalDetailModel";
import MapHospitalDetailCollapsedRow from "./MapHospitalDetailCollapsedRow";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
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
	const { isSidebarPresentation, centerContent, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
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
			? "rgba(148,163,184,0.14)"
			: "rgba(255,255,255,0.82)";
	const floatingCloseSurface = isHeroTopPresentation
		? "rgba(15,23,42,0.24)"
		: isDarkMode
			? "rgba(148,163,184,0.14)"
			: "rgba(255,255,255,0.42)";
	const floatingCycleSurface = !isDarkMode
			? "rgba(148,163,184,0.14)"
			: "rgba(255,255,255,0.05)";
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
		androidCollapseHandlers,
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
		if (snapState !== MAP_SHEET_SNAP_STATES.EXPANDED && showFloatingTitle) {
			setShowFloatingTitle(false);
		}
	}, [showFloatingTitle, snapState]);

	const collapsedTopSlot = (
		<MapHospitalDetailCollapsedRow
			action={model.collapsedAction}
			title={model.summary.title}
			subtitle={model.collapsedDistanceLabel}
			onExpand={() => onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF)}
			onClose={onClose}
			titleColor={titleColor}
			mutedColor={mutedColor}
			isDarkMode={isDarkMode}
			iconSurfaceColor={iconSurfaceColor}
			iconBorderColor={iconBorderColor}
		/>
	);
	const floatingTopSlot = (
		<View pointerEvents="box-none" style={styles.floatingTopSlot}>
			<View
				pointerEvents="box-none"
				style={[
					styles.floatingTopHeader,
					centerContent && contentMaxWidth
						? {
								left: null,
								right: null,
								width: "100%",
								maxWidth: contentMaxWidth,
								alignSelf: "center",
								paddingHorizontal: 14,
							}
						: null,
				]}
			>
				{canCycleHospital ? (
					<Pressable
						onPress={onCycleHospital}
						accessibilityRole="button"
						accessibilityLabel="Show next hospital"
						hitSlop={10}
						style={styles.floatingTopActionPressable}
					>
						{({ pressed }) => (
							<View
							style={[
								styles.floatingTopActionButton,
								{ backgroundColor: floatingCycleSurface },
								pressed ? styles.floatingTopCloseButtonPressed : null,
							]}
						>
							<MaterialIcons name="next-plan" size={40} color={floatingCycleIconColor} />
						</View>
					)}
				</Pressable>
				) : (
					<View style={styles.floatingTopSpacer} />
				)}
				<View style={styles.floatingTopTitleWrap}>
					{shouldShowFloatingTitle ? (
						<Text numberOfLines={1} style={[styles.floatingTopTitle, { color: floatingTitleColor }]}>
							{model.summary.title}
						</Text>
					) : null}
				</View>
				<Pressable
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Close hospital details"
					hitSlop={10}
					style={styles.floatingTopClosePressable}
				>
					{({ pressed }) => (
						<View
							style={[
								styles.floatingTopCloseButton,
								{ backgroundColor: floatingCloseSurface },
								pressed ? styles.floatingTopCloseButtonPressed : null,
							]}
						>
							<Ionicons name="close" size={18} color={floatingCloseIconColor} />
						</View>
					)}
				</Pressable>
			</View>
		</View>
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={isCollapsed ? collapsedTopSlot : floatingTopSlot}
			handleFloatsOverContent={!isCollapsed}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
				<ScrollView
					{...androidCollapseHandlers}
					ref={bodyScrollRef}
					style={sheetStageStyles.bodyScrollViewport}
					contentContainerStyle={[
						sheetStageStyles.bodyScrollContent,
						sheetStageStyles.bodyScrollContentSheet,
						presentationMode === "modal" ? sheetStageStyles.bodyScrollContentModal : null,
						isSidebarPresentation ? sheetStageStyles.bodyScrollContentPanel : null,
						isSidebarPresentation ? sheetStageStyles.bodyScrollContentSidebar : null,
						centerContent && contentMaxWidth
							? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
							: null,
						styles.bodyScrollContent,
					]}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
					bounces={!isSidebarPresentation}
					alwaysBounceVertical={!isSidebarPresentation}
					overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
					directionalLockEnabled
					scrollEventThrottle={16}
					onWheel={handleBodyWheel}
					onScrollBeginDrag={handleHospitalScrollBeginDrag}
					onScroll={(event) => {
						handleAndroidCollapseScroll(event);
						handleHospitalScroll(event);
					}}
					onScrollEndDrag={handleBodyScrollEndDrag}
					onMomentumScrollEnd={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
				>
					<MapHospitalDetailBody
						model={model}
						revealHero={snapState === MAP_SHEET_SNAP_STATES.EXPANDED}
						onExpandedHeaderLayout={handleExpandedHeaderLayout}
						onCycleHospital={onCycleHospital}
					/>
				</ScrollView>
			)}
		</MapSheetShell>
	);
}
