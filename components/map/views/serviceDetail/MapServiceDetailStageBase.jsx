import React, { useCallback, useMemo } from "react";
import { Image, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../../../contexts/ThemeContext";
import { COLORS } from "../../../../constants/colors";
import { GLASS_SURFACE_VARIANTS, getGlassSurfaceTokens } from "../../../../constants/surfaces";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import { buildServiceCopy } from "../../surfaces/hospitals/MapHospitalServiceDetailSheet";
import { getHospitalDetailServiceImageSource } from "../../surfaces/hospitals/mapHospitalDetail.content";

function TopSlot({ title, onClose, titleColor, closeSurface }) {
	return (
		<View style={styles.topSlot}>
			<View style={styles.topSlotSpacer} />
			<Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
				{title}
			</Text>
			<Pressable onPress={onClose} style={styles.topSlotAction}>
				{({ pressed }) => (
					<View
						style={[
							styles.topSlotCloseButton,
							{ backgroundColor: closeSurface },
							pressed ? styles.topSlotPressed : null,
						]}
					>
						<Ionicons name="close" size={18} color={titleColor} />
					</View>
				)}
			</Pressable>
		</View>
	);
}

function ServiceGlassPanel({
	children,
	style,
	backgroundColor,
	glassTokens,
	isDarkMode,
	panHandlers,
}) {
	const isAndroid = Platform.OS === "android";

	return (
		<View style={[styles.glassSurface, style, { backgroundColor }]} {...panHandlers}>
			{isAndroid ? (
				<>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFillObject,
							styles.androidGlassUnderlay,
							{ backgroundColor: glassTokens.underlayColor },
						]}
					/>
					<LinearGradient
						pointerEvents="none"
						colors={
							isDarkMode
								? ["rgba(255,255,255,0.08)", "rgba(8,15,27,0.10)", "rgba(255,255,255,0.035)"]
								: ["rgba(255,255,255,0.66)", "rgba(248,250,252,0.24)", "rgba(255,255,255,0.50)"]
						}
						locations={[0, 0.52, 1]}
						style={StyleSheet.absoluteFillObject}
					/>
				</>
			) : null}
			{children}
		</View>
	);
}

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
	const closeSurface = isDarkMode ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.72)";
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

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<TopSlot
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
				<ServiceGlassPanel
					style={styles.headerBlock}
					backgroundColor={surfaceColor}
					glassTokens={glassTokens}
					isDarkMode={isDarkMode}
					panHandlers={swipeResponder.panHandlers}
				>
					<View style={styles.headerMetaRow}>
						<Text style={[styles.eyebrow, { color: accent }]}>
							{serviceType === "room" ? "Room option" : "Transport"}
						</Text>
						{servicePositionLabel ? (
							<Text style={[styles.positionLabel, { color: mutedColor }]}>{servicePositionLabel}</Text>
						) : null}
					</View>
					<Text style={[styles.summary, { color: mutedColor }]}>
						{copy.summary}
					</Text>
				</ServiceGlassPanel>

				<View style={styles.sectionSpacer} />

				<ServiceGlassPanel
					style={styles.heroCard}
					backgroundColor={surfaceColor}
					glassTokens={glassTokens}
					isDarkMode={isDarkMode}
					panHandlers={swipeResponder.panHandlers}
				>
					{imageSource ? (
						<Image source={imageSource} resizeMode="contain" fadeDuration={0} style={styles.heroImage} />
					) : null}
					<LinearGradient
						pointerEvents="none"
						colors={
							isDarkMode
								? ["rgba(255,255,255,0.05)", "rgba(15,23,42,0.18)"]
								: ["rgba(255,255,255,0.36)", "rgba(15,23,42,0.055)"]
						}
						style={StyleSheet.absoluteFillObject}
					/>
				</ServiceGlassPanel>

				<View style={styles.sectionSpacer} />

				<View style={styles.metricRow}>
					<View
						style={[
							styles.metricPill,
							styles.metricPillSpaced,
							{ backgroundColor: nestedSurfaceColor },
						]}
					>
						<View style={styles.metricIconBox}>
							<Ionicons name="checkmark-circle-outline" size={15} color={accent} />
						</View>
						<Text style={[styles.metricText, { color: titleColor }]}>{statusLabel}</Text>
					</View>
					<View style={[styles.metricPill, { backgroundColor: nestedSurfaceColor }]}>
						<View style={styles.metricIconBox}>
							<Ionicons name="cash-outline" size={15} color={accent} />
						</View>
						<Text style={[styles.metricText, { color: titleColor }]}>{priceLabel}</Text>
					</View>
				</View>

				<View style={styles.sectionSpacerLarge} />

				<View>
					<Text style={[styles.sectionLabel, { color: mutedColor }]}>What to expect</Text>
					<ServiceGlassPanel
						style={styles.featureList}
						backgroundColor={nestedSurfaceColor}
						glassTokens={glassTokens}
						isDarkMode={isDarkMode}
						panHandlers={swipeResponder.panHandlers}
					>
						{copy.features.map((feature, index) => (
							<View
								key={feature}
								style={[
									styles.featureRow,
									index > 0 ? styles.featureRowSpaced : null,
								]}
							>
								<View style={[styles.featureDot, { backgroundColor: accent }]} />
								<Text style={[styles.featureText, { color: titleColor }]}>{feature}</Text>
							</View>
						))}
					</ServiceGlassPanel>
				</View>

				<View style={styles.footerGap} />
			</MapStageBodyScroll>

			<View style={[styles.footerDock, modalContainedStyle]}>
				<Pressable
					onPress={onConfirm}
					style={[
						styles.primaryButton,
						{ backgroundColor: isSelected ? "rgba(134,16,14,0.72)" : COLORS.brandPrimary },
					]}
				>
					<Text style={styles.primaryButtonText}>
						{isSelected
							? serviceType === "room"
								? "Room selected"
								: "Transport selected"
							: serviceType === "room"
								? "Select room"
								: "Select transport"}
					</Text>
				</Pressable>
			</View>
		</MapSheetShell>
	);
}

const styles = StyleSheet.create({
	topSlot: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingBottom: 0,
		paddingTop: 0,
		marginTop: Platform.OS === "android" ? -6 : 0,
	},
	topSlotSpacer: {
		width: 34,
		height: 34,
	},
	topSlotTitle: {
		flex: 1,
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "700",
		textAlign: "center",
		paddingHorizontal: 8,
	},
	topSlotAction: {
		width: 34,
		height: 34,
	},
	topSlotCloseButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
	topSlotPressed: {
		opacity: 0.92,
		transform: [{ scale: 0.97 }],
	},
	bodyContent: {
		paddingHorizontal: 14,
		paddingTop: Platform.OS === "android" ? 2 : 0,
		paddingBottom: 116,
	},
	glassSurface: {
		position: "relative",
		shadowColor: "#0F172A",
		shadowOpacity: Platform.OS === "android" ? 0 : 0.08,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },
		elevation: Platform.OS === "android" ? 0 : 0,
		overflow: "hidden",
	},
	androidGlassUnderlay: {
		top: 1,
		bottom: -1,
	},
	sectionSpacer: {
		height: Platform.OS === "android" ? 20 : 18,
	},
	sectionSpacerLarge: {
		height: Platform.OS === "android" ? 24 : 20,
	},
	headerBlock: {
		borderRadius: 28,
		paddingHorizontal: 18,
		paddingVertical: 18,
	},
	headerMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	eyebrow: {
		flexShrink: 1,
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
	},
	positionLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		marginLeft: 12,
	},
	summary: {
		fontSize: 14,
		lineHeight: 21,
		fontWeight: "400",
		marginTop: 8,
	},
	heroCard: {
		height: 184,
		borderRadius: 30,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	heroImage: {
		width: "100%",
		height: "100%",
	},
	metricRow: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	metricPillSpaced: {
		marginRight: 10,
		marginBottom: Platform.OS === "android" ? 8 : 0,
	},
	metricPill: {
		height: Platform.OS === "android" ? 36 : 36,
		paddingLeft: Platform.OS === "android" ? 12 : 12,
		paddingRight: Platform.OS === "android" ? 12 : 12,
		paddingTop: 0,
		paddingBottom: 0,
		borderRadius: 999,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	metricIconBox: {
		width: 16,
		height: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	metricText: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "700",
		marginLeft: 6,
		includeFontPadding: false,
		textAlignVertical: "center",
	},
	sectionLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
		marginBottom: 12,
	},
	featureList: {
		borderRadius: 24,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	featureRowSpaced: {
		marginTop: 12,
	},
	featureDot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		marginTop: 6,
		marginRight: 11,
	},
	featureText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	footerGap: {
		height: 12,
	},
	footerDock: {
		position: "absolute",
		left: 14,
		right: 14,
		bottom: 16,
	},
	primaryButton: {
		minHeight: 56,
		borderRadius: 20,
		paddingHorizontal: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "800",
	},
});
