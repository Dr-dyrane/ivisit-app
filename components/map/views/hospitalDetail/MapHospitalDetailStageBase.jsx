import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
	isSidebarMapVariant,
} from "../../core/mapViewportConfig";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapHospitalDetailBody from "../../surfaces/hospitals/MapHospitalDetailBody";
import useMapHospitalDetailModel from "../../surfaces/hospitals/useMapHospitalDetailModel";
import MapHospitalDetailCollapsedRow from "./MapHospitalDetailCollapsedRow";
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
	const handleHospitalScroll = useCallback(
		(event) => {
			handleBodyScroll(event);
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			const nextShowTitle =
				snapState === MAP_SHEET_SNAP_STATES.EXPANDED &&
				offsetY > ((expandedHeaderBottom ?? 88) + FLOATING_TITLE_REVEAL_DELAY);
			setShowFloatingTitle((current) => (current === nextShowTitle ? current : nextShowTitle));
		},
		[expandedHeaderBottom, handleBodyScroll, snapState],
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
			<View pointerEvents="box-none" style={styles.floatingTopHeader}>
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
					ref={bodyScrollRef}
					style={styles.bodyScrollViewport}
					contentContainerStyle={styles.bodyScrollContent}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled
					bounces={!isSidebarPresentation}
					alwaysBounceVertical={!isSidebarPresentation}
					overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
					directionalLockEnabled
					scrollEventThrottle={16}
					onWheel={handleBodyWheel}
					onScrollBeginDrag={handleBodyScrollBeginDrag}
					onScroll={handleHospitalScroll}
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
