import React, { useCallback, useMemo } from "react";
import { PanResponder, Platform, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { COLORS } from "../../../../constants/colors";
import { GLASS_SURFACE_VARIANTS, getGlassSurfaceTokens } from "../../../../constants/surfaces";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import {
	MapServiceDetailFeatures,
	MapServiceDetailFooter,
	MapServiceDetailHeader,
	MapServiceDetailHero,
	MapServiceDetailMetrics,
	MapServiceDetailTopSlot,
} from "./MapServiceDetailStageParts";
import { buildServiceCopy } from "./mapServiceDetail.content";
import styles from "./mapServiceDetailStage.styles";

export default function MapServiceDetailStageBase({
	sheetHeight,
	snapState,
	payload,
	selectedServiceId = null,
	onClose,
	onConfirm,
	onChangeService,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const glassTokens = useMemo(
		() =>
			getGlassSurfaceTokens({
				isDarkMode,
				variant: GLASS_SURFACE_VARIANTS.HEADER,
			}),
		[isDarkMode],
	);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
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

	const service = payload?.service || null;
	const serviceType = payload?.serviceType || "ambulance";
	const serviceItems = Array.isArray(payload?.serviceItems)
		? payload.serviceItems.filter((entry) => !entry?.isSkeleton && entry?.enabled !== false)
		: [];
	const title = service?.title || (serviceType === "room" ? "Room option" : "Transport");
	const imageSource = service ? getHospitalDetailServiceImageSource(service, serviceType) : null;
	const copy = buildServiceCopy(service, serviceType);
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const surfaceColor =
		Platform.OS === "android"
			? isDarkMode
				? glassTokens.surfaceColor
				: "rgba(255,255,255,0.58)"
			: isDarkMode
				? "rgba(255,255,255,0.075)"
				: "rgba(255,255,255,0.64)";
	const nestedSurfaceColor =
		Platform.OS === "android"
			? isDarkMode
				? "rgba(18,24,38,0.58)"
				: "rgba(255,255,255,0.42)"
			: isDarkMode
				? "rgba(255,255,255,0.055)"
				: "rgba(15,23,42,0.045)";
	const closeSurface = isDarkMode ? "rgba(148,163,184,0.14)" : "rgba(255,255,255,0.42)";
	const accent = serviceType === "room" ? "#64748B" : COLORS.brandPrimary;
	const isSelected = service?.id === selectedServiceId;
	const statusLabel = service?.metaText || (serviceType === "room" ? "Available" : "Ready");
	const priceLabel = service?.priceText || "Price shown before booking";
	const currentServiceIndex = serviceItems.findIndex(
		(entry) => (entry?.id || entry?.title) === (service?.id || service?.title),
	);
	const hasServiceCarousel = serviceItems.length > 1 && currentServiceIndex >= 0;
	const servicePositionLabel = hasServiceCarousel
		? `${currentServiceIndex + 1} of ${serviceItems.length}`
		: null;

	const changeServiceByOffset = useCallback(
		(offset) => {
			if (!hasServiceCarousel) return;
			const nextIndex =
				(currentServiceIndex + offset + serviceItems.length) % serviceItems.length;
			const nextService = serviceItems[nextIndex];
			if (nextService) {
				onChangeService?.(nextService);
			}
		},
		[currentServiceIndex, hasServiceCarousel, onChangeService, serviceItems],
	);

	const swipeResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					return absDx > 24 && absDx > absDy * 1.5;
				},
				onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					return absDx > 24 && absDx > absDy * 1.5;
				},
				onPanResponderRelease: (_event, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					if (absDx < 58 || absDx < absDy * 1.35) return;
					changeServiceByOffset(gestureState.dx < 0 ? 1 : -1);
				},
				onPanResponderTerminationRequest: () => true,
			}),
		[changeServiceByOffset],
	);
	const swipeHandlers = swipeResponder.panHandlers;

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapServiceDetailTopSlot
					title={title}
					onClose={onClose}
					titleColor={titleColor}
					closeSurface={closeSurface}
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
					styles.bodyContent,
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
				<MapServiceDetailHeader
					accent={accent}
					copy={copy}
					glassTokens={glassTokens}
					isDarkMode={isDarkMode}
					mutedColor={mutedColor}
					panHandlers={swipeHandlers}
					servicePositionLabel={servicePositionLabel}
					serviceType={serviceType}
					surfaceColor={surfaceColor}
				/>

				<View style={styles.sectionSpacer} />

				<MapServiceDetailHero
					glassTokens={glassTokens}
					imageSource={imageSource}
					isDarkMode={isDarkMode}
					panHandlers={swipeHandlers}
					surfaceColor={surfaceColor}
				/>

				<View style={styles.sectionSpacer} />

				<MapServiceDetailMetrics
					accent={accent}
					nestedSurfaceColor={nestedSurfaceColor}
					priceLabel={priceLabel}
					statusLabel={statusLabel}
					titleColor={titleColor}
				/>

				<View style={styles.sectionSpacerLarge} />

				<MapServiceDetailFeatures
					accent={accent}
					copy={copy}
					glassTokens={glassTokens}
					isDarkMode={isDarkMode}
					mutedColor={mutedColor}
					nestedSurfaceColor={nestedSurfaceColor}
					panHandlers={swipeHandlers}
					titleColor={titleColor}
				/>

				<View style={styles.footerGap} />
			</MapStageBodyScroll>

			<MapServiceDetailFooter
				isSelected={isSelected}
				modalContainedStyle={modalContainedStyle}
				onConfirm={onConfirm}
				serviceType={serviceType}
			/>
		</MapSheetShell>
	);
}
