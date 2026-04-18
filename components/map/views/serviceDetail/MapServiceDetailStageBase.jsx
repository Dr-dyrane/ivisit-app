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
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import {
	MapServiceDetailFeatures,
	MapServiceDetailFooter,
	MapServiceDetailHeader,
	MapServiceDetailHero,
	MapServiceDetailMetrics,
	MapServiceDetailOptionList,
	MapServiceDetailSwitchRow,
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
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const webWideInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideContentInset
			: null;
	const webWideTopSlotInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideTopSlotInset
			: null;
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

	const service = payload?.service || null;
	const serviceType = payload?.serviceType || "ambulance";
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;
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
	const priceLabel = service?.priceText || null;
	const showPriceSkeleton = Boolean(service?.showPriceSkeleton && !priceLabel);
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
					const absVx = Math.abs(gestureState.vx || 0);
					return absDx > 16 && (absDx > absDy * 1.18 || absVx > 0.22);
				},
				onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					const absVx = Math.abs(gestureState.vx || 0);
					return absDx > 16 && (absDx > absDy * 1.18 || absVx > 0.22);
				},
				onPanResponderRelease: (_event, gestureState) => {
					const absDx = Math.abs(gestureState.dx || 0);
					const absDy = Math.abs(gestureState.dy || 0);
					const absVx = Math.abs(gestureState.vx || 0);
					const hasDistanceIntent = absDx > 42 && absDx > absDy * 1.08;
					const hasVelocityIntent = absVx > 0.38 && absDx > 18;
					if (!hasDistanceIntent && !hasVelocityIntent) return;
					changeServiceByOffset(gestureState.dx < 0 ? 1 : -1);
				},
				onPanResponderTerminationRequest: () => true,
			}),
		[changeServiceByOffset],
	);
	const swipeHandlers = swipeResponder.panHandlers;
	const handleAdvanceSelectedService = useCallback(
		(item) => {
			const itemId = item?.id || item?.title;
			const activeId = service?.id || service?.title;
			if (!itemId || itemId !== activeId) return;
			onConfirm?.();
		},
		[onConfirm, service?.id, service?.title],
	);

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
					stageMetrics={stageMetrics}
					containerStyle={webWideTopSlotInsetStyle}
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
					webWideInsetStyle,
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
				<MapServiceDetailHeader
					accent={accent}
					copy={copy}
					glassTokens={glassTokens}
					isDarkMode={isDarkMode}
					mutedColor={mutedColor}
					nestedSurfaceColor={nestedSurfaceColor}
					positionLabel={serviceType === "room" ? statusLabel : null}
					servicePositionLabel={servicePositionLabel}
					serviceType={serviceType}
					stageMetrics={stageMetrics}
					surfaceColor={surfaceColor}
				/>

				<View style={[styles.sectionSpacer, stageMetrics.section.spacerStyle]} />

				{!isExpanded ? (
					<>
						<MapServiceDetailSwitchRow
							accent={accent}
							mutedColor={mutedColor}
							nestedSurfaceColor={nestedSurfaceColor}
							isDarkMode={isDarkMode}
							onSelectService={onChangeService}
							onAdvanceSelectedService={handleAdvanceSelectedService}
							selectedServiceId={service?.id || service?.title || null}
							serviceItems={serviceItems}
							serviceType={serviceType}
							stageMetrics={stageMetrics}
							titleColor={titleColor}
						/>

						{hasServiceCarousel ? (
							<View style={[styles.sectionSpacer, stageMetrics.section.spacerStyle]} />
						) : null}
					</>
				) : null}

				<MapServiceDetailHero
					accent={accent}
					glassTokens={glassTokens}
					imageSource={imageSource}
					isDarkMode={isDarkMode}
					priceLabel={priceLabel}
					showPriceSkeleton={showPriceSkeleton}
					panHandlers={swipeHandlers}
					service={service}
					serviceType={serviceType}
					surfaceColor={surfaceColor}
					stageMetrics={stageMetrics}
					titleColor={titleColor}
				/>

				<View style={[styles.sectionSpacer, stageMetrics.section.spacerStyle]} />

				{!(isExpanded && hasServiceCarousel) && serviceType !== "ambulance" ? (
					<MapServiceDetailMetrics
						accent={accent}
						nestedSurfaceColor={nestedSurfaceColor}
						priceLabel={priceLabel}
						showPriceSkeleton={showPriceSkeleton}
						statusLabel={statusLabel}
						titleColor={titleColor}
					/>
				) : null}

				{isExpanded && hasServiceCarousel ? (
					<>
						<View style={[styles.sectionSpacerLarge, stageMetrics.section.largeSpacerStyle]} />
						<MapServiceDetailOptionList
							accent={accent}
							isDarkMode={isDarkMode}
							mutedColor={mutedColor}
							onSelectService={onChangeService}
							onAdvanceSelectedService={handleAdvanceSelectedService}
							selectedServiceId={service?.id || service?.title || null}
							serviceItems={serviceItems}
							serviceType={serviceType}
							surfaceColor={nestedSurfaceColor}
							stageMetrics={stageMetrics}
							titleColor={titleColor}
						/>
					</>
				) : (
					<View style={[styles.sectionSpacerLarge, stageMetrics.section.largeSpacerStyle]} />
				)}

				<View style={[styles.sectionSpacerLarge, stageMetrics.section.largeSpacerStyle]} />

				<MapServiceDetailFeatures
					accent={accent}
					copy={copy}
					glassTokens={glassTokens}
					isDarkMode={isDarkMode}
					mutedColor={mutedColor}
					nestedSurfaceColor={nestedSurfaceColor}
					panHandlers={swipeHandlers}
					stageMetrics={stageMetrics}
					titleColor={titleColor}
				/>

				<View style={styles.footerGap} />

				<MapServiceDetailFooter
					isSelected={isSelected}
					modalContainedStyle={null}
					onConfirm={onConfirm}
					serviceType={serviceType}
					stageMetrics={stageMetrics}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
