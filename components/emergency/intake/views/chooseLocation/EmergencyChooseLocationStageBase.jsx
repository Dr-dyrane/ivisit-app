import React, { useCallback, useMemo, useRef, useState } from "react";
import {
	Animated,
	Image,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../../../../contexts/ThemeContext";
import useAuthViewport from "../../../../../hooks/ui/useAuthViewport";
import EmergencyLocationPreviewMap from "../../EmergencyLocationPreviewMap";
import createEmergencyChooseLocationTheme from "./emergencyChooseLocationTheme";

function FindingAmbientLayer({ gradientId, color, style }) {
	return (
		<View pointerEvents="none" style={style}>
			<Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
				<Defs>
					<RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
						<Stop offset="0%" stopColor={color} stopOpacity="0.26" />
						<Stop offset="42%" stopColor={color} stopOpacity="0.12" />
						<Stop offset="72%" stopColor={color} stopOpacity="0.05" />
						<Stop offset="100%" stopColor={color} stopOpacity="0" />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
			</Svg>
		</View>
	);
}

/* ── Sheet handle ──────────────────────────────────────────── */
function SheetHandle({ isDarkMode }) {
	return (
		<View style={sheetStyles.handleContainer}>
			<View style={sheetStyles.grabber} />
		</View>
	);
}

/* ── Sheet background ──────────────────────────────────────── */
function SheetBackground({ isDarkMode, style }) {
	return (
		<View
			style={[
				style,
				sheetStyles.background,
				{
					backgroundColor: isDarkMode
						? "rgba(8, 13, 22, 0.94)"
						: "rgba(255, 255, 255, 0.94)",
				},
			]}
		/>
	);
}

/* ── Hospital row in expanded sheet ────────────────────────── */
function HospitalRow({ hospital, isSelected, isDarkMode, onPress }) {
	const textColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const distanceLabel =
		hospital?.distanceKm != null
			? hospital.distanceKm < 1
				? `${Math.round(hospital.distanceKm * 1000)}m`
				: `${hospital.distanceKm.toFixed(1)}km`
			: null;
	const bedLabel =
		hospital?.availableBeds != null && hospital.availableBeds > 0
			? `${hospital.availableBeds} beds`
			: null;

	return (
		<Pressable
			onPress={() => onPress?.(hospital)}
			style={({ pressed }) => [
				sheetStyles.hospitalRow,
				{
					backgroundColor: isSelected
						? isDarkMode
							? "rgba(37, 99, 235, 0.12)"
							: "rgba(37, 99, 235, 0.06)"
						: "transparent",
				},
				pressed && { opacity: 0.7 },
			]}
			accessible
			accessibilityRole="button"
			accessibilityLabel={hospital?.name || "Hospital"}
		>
			<View
				style={[
					sheetStyles.hospitalIcon,
					{
						backgroundColor: isSelected
							? "rgba(239, 68, 68, 0.14)"
							: isDarkMode
								? "rgba(148, 163, 184, 0.12)"
								: "rgba(15, 23, 42, 0.06)",
					},
				]}
			>
				<Ionicons
					name="medical"
					size={16}
					color={isSelected ? "#EF4444" : isDarkMode ? "#94A3B8" : "#64748B"}
				/>
			</View>
			<View style={sheetStyles.hospitalInfo}>
				<Text
					style={[sheetStyles.hospitalName, { color: textColor }]}
					numberOfLines={1}
				>
					{hospital?.name || "Hospital"}
				</Text>
				<Text
					style={[sheetStyles.hospitalMeta, { color: mutedColor }]}
					numberOfLines={1}
				>
					{[distanceLabel, bedLabel, hospital?.verified ? "Verified" : null]
						.filter(Boolean)
						.join(" · ")}
				</Text>
			</View>
			{isSelected ? (
				<Ionicons name="checkmark-circle" size={20} color="#2563EB" />
			) : null}
		</Pressable>
	);
}

/* ── Main component ────────────────────────────────────────── */
export default function EmergencyChooseLocationStageBase({
	variant = "ios-mobile",
	flowState,
	headlineText,
	helperText,
	shouldRenderFindingUi,
	shouldShowLocationSkeleton,
	shouldShowLocationPreviewMap,
	activeLocation,
	findingStatusMessage,
	confirmPrimaryLabel,
	onPrimaryPress,
	onSecondaryPress,
	onAmbulancePress,
	onBedPress,
	onSheetFullScreen,
	secondaryLabel,
	heroScale,
	pulseScale,
	skeletonOpacity,
	locationPreviewOpacity,
	locationPreviewTranslateY,
	locationPreviewScale,
	findingRailProgress,
	onActionLayout,
	locationLabel,
	locationDetail,
	hospitalOptions = [],
	selectedHospital = null,
}) {
	const { isDarkMode } = useTheme();
	const { height: viewportHeight } = useAuthViewport();
	const { fontScale } = useWindowDimensions();
	const sheetRef = useRef(null);
	const { colors, styles } = createEmergencyChooseLocationTheme({
		variant,
		isDarkMode,
		viewportHeight,
		fontScale,
	});

	const textColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedTextColor = isDarkMode ? "#CBD5E1" : "#475569";
	const quietColor = isDarkMode ? "#94A3B8" : "#475569";
	const topHospitals = hospitalOptions.slice(0, 6);
	const isWeb = Platform.OS === "web";
	const [sheetIndex, setSheetIndex] = useState(0);
	const supportCopy =
		locationDetail && locationDetail.trim().length > 0
			? locationDetail.trim()
			: "Help near this location";

	/* snap points: peek (intent row visible) → half (+ hospitals) → full */
	const snapPoints = useMemo(() => {
		const peek = Math.min(Math.max(viewportHeight * 0.25, 212), 248);
		const half = Math.round(viewportHeight * 0.48);
		const full = Math.round(viewportHeight * 0.92);
		return [peek, half, full];
	}, [viewportHeight]);

	const handleSheetChange = useCallback(
		(index) => {
			setSheetIndex(index);
			onSheetFullScreen?.(index >= 2);
		},
		[onSheetFullScreen],
	);

	const preserveAndroidMapDuringSkeleton =
		variant === "android-mobile" &&
		!!activeLocation &&
		Number.isFinite(Number(activeLocation.latitude)) &&
		Number.isFinite(Number(activeLocation.longitude));
	const shouldRenderMapPreview =
		shouldShowLocationPreviewMap ||
		(preserveAndroidMapDuringSkeleton && shouldShowLocationSkeleton);
	const mapAnimatedStyle = shouldShowLocationPreviewMap
		? {
				opacity: locationPreviewOpacity,
				transform: [
					{ translateY: locationPreviewTranslateY },
					{ scale: locationPreviewScale },
				],
			}
		: null;

	const renderHandle = useCallback(
		() => <SheetHandle isDarkMode={isDarkMode} />,
		[isDarkMode],
	);
	const renderBackground = useCallback(
		(props) => <SheetBackground isDarkMode={isDarkMode} {...props} />,
		[isDarkMode],
	);

	/* ─── Map layer ──────────────────────────────────────── */
	const mapBlock =
		shouldShowLocationSkeleton && !preserveAndroidMapDuringSkeleton ? (
			<Animated.View style={[styles.mapSkeleton, { opacity: skeletonOpacity }]}>
				<View style={styles.mapSkeletonGridA} />
				<View style={styles.mapSkeletonGridB} />
				<View style={styles.mapSkeletonGridC} />
				<View style={styles.mapSkeletonPill} />
				<View style={styles.mapSkeletonPinWrap}>
					<View style={styles.mapSkeletonPin} />
				</View>
			</Animated.View>
		) : shouldRenderMapPreview ? (
			<Animated.View
				style={[
					styles.mapWrap,
					mapStyles.fullMapFill,
					mapAnimatedStyle,
				]}
			>
				<EmergencyLocationPreviewMap
					location={activeLocation}
					hospitals={topHospitals}
					selectedHospitalId={selectedHospital?.id || hospitalOptions[0]?.id}
					placeLabel={locationLabel}
					interactive
				/>
			</Animated.View>
		) : null;

	/* ─── Render ─────────────────────────────────────────── */
	return (
		<View style={mapStyles.root}>
			{/* Full-screen map */}
			<View style={mapStyles.mapBackdrop}>
				{mapBlock}
				{shouldRenderFindingUi ? (
					<Animated.View
						pointerEvents="none"
						style={[mapStyles.findingAmbientWrap, { opacity: 0.88 }]}
					>
						<FindingAmbientLayer
							gradientId={`${variant}-finding-outer`}
							color={colors.findingHaloOuter}
							style={mapStyles.findingHaloOuter}
						/>
						<FindingAmbientLayer
							gradientId={`${variant}-finding-middle`}
							color={colors.findingHaloMiddle}
							style={mapStyles.findingHaloMiddle}
						/>
						<FindingAmbientLayer
							gradientId={`${variant}-finding-inner`}
							color={colors.findingHaloInner}
							style={mapStyles.findingHaloInner}
						/>
					</Animated.View>
				) : null}
			</View>

			{/* Draggable bottom sheet */}
			<BottomSheet
				ref={sheetRef}
				index={0}
				snapPoints={snapPoints}
				handleComponent={renderHandle}
				backgroundComponent={renderBackground}
				enablePanDownToClose={false}
				enableOverDrag={true}
				enableDynamicSizing={false}
				animateOnMount={true}
				overDragResistanceFactor={2.5}
				bottomInset={0}
				onChange={handleSheetChange}
				style={mapStyles.sheetShadow}
			>
				<BottomSheetScrollView
					contentContainerStyle={sheetStyles.scrollContent}
					showsVerticalScrollIndicator={false}
					bounces={true}
				>
					<View style={sheetStyles.locationHeader}>
						<Text style={[sheetStyles.locationEyebrow, { color: quietColor }]}>
							Choose care
						</Text>
						<Text
							style={[sheetStyles.locationTitle, { color: textColor }]}
							numberOfLines={1}
						>
							{locationLabel || "Current location"}
						</Text>
						<Text
							style={[sheetStyles.locationSupport, { color: mutedTextColor }]}
							numberOfLines={1}
						>
							{supportCopy}
						</Text>
					</View>

					{/* Search bar — top of sheet */}
					<Pressable
						onPress={onSecondaryPress}
						onLayout={onActionLayout}
						style={[
							sheetStyles.searchRow,
							{
								backgroundColor: isDarkMode
									? "rgba(15,23,42,0.65)"
									: "rgba(15,23,42,0.05)",
							},
						]}
					>
						<Ionicons name="search-outline" size={18} color={quietColor} />
						<Text
							style={[
								sheetStyles.searchPlaceholder,
								{ color: mutedTextColor },
							]}
							numberOfLines={1}
						>
							Change location
						</Text>
					</Pressable>

					{/* Intent icons — ambulance / bed */}
					{!shouldRenderFindingUi && flowState !== "request_started" ? (
						<View style={sheetStyles.intentRow}>
							<Pressable
								onPress={onAmbulancePress || onPrimaryPress}
								style={({ pressed }) => [
									sheetStyles.intentButton,
									{
										backgroundColor: isDarkMode
											? "rgba(15,23,42,0.5)"
											: "rgba(15,23,42,0.04)",
									},
									pressed && { opacity: 0.7 },
								]}
								accessible
								accessibilityRole="button"
								accessibilityLabel="Request ambulance"
							>
								<View
									style={[
										sheetStyles.intentIconWrap,
										{ backgroundColor: "rgba(239,68,68,0.12)" },
									]}
								>
									<Ionicons name="car-sport" size={32} color="#EF4444" />
								</View>
								<Text style={[sheetStyles.intentLabel, { color: textColor }]}>
									Ambulance
								</Text>
							</Pressable>
							<Pressable
								onPress={onBedPress}
								style={({ pressed }) => [
									sheetStyles.intentButton,
									{
										backgroundColor: isDarkMode
											? "rgba(15,23,42,0.5)"
											: "rgba(15,23,42,0.04)",
									},
									pressed && { opacity: 0.7 },
								]}
								accessible
								accessibilityRole="button"
								accessibilityLabel="Reserve hospital bed"
							>
								<View
									style={[
										sheetStyles.intentIconWrap,
										{ backgroundColor: "rgba(37,99,235,0.12)" },
									]}
								>
									<Ionicons name="bed" size={32} color="#2563EB" />
								</View>
								<Text style={[sheetStyles.intentLabel, { color: textColor }]}>
									Hospital bed
								</Text>
							</Pressable>
						</View>
					) : null}

					{/* Finding state */}
					{shouldRenderFindingUi ? (
						<View style={sheetStyles.findingCard}>
							<View style={sheetStyles.findingRailTrack}>
								<Animated.View
									style={[
										sheetStyles.findingRailBar,
										{
											backgroundColor: colors?.brand || "#2563EB",
											transform: [
												{
													translateX:
														findingRailProgress.interpolate({
															inputRange: [0, 1],
															outputRange: [-60, 60],
														}),
												},
											],
										},
									]}
								/>
							</View>
							<Text
								style={[
									sheetStyles.findingStatusText,
									{ color: textColor },
								]}
							>
								{findingStatusMessage}
							</Text>
						</View>
					) : null}

					{/* Skeleton while locating */}
					{flowState === "request_started" ? (
						<Animated.View
							style={[
								sheetStyles.skeletonCard,
								{ opacity: skeletonOpacity },
							]}
						>
							<View style={sheetStyles.skeletonLineLong} />
							<View style={sheetStyles.skeletonLineShort} />
						</Animated.View>
					) : null}

					{/* Nearby hospitals (visible when sheet is dragged up) */}
					{topHospitals.length > 0 &&
					sheetIndex >= 1 &&
					!shouldRenderFindingUi &&
					flowState !== "request_started" ? (
						<View style={sheetStyles.hospitalsSection}>
							<Text
								style={[
									sheetStyles.sectionTitle,
									{ color: mutedTextColor },
								]}
							>
								Nearby hospitals
							</Text>
							{topHospitals.map((hospital) => (
								<HospitalRow
									key={hospital.id}
									hospital={hospital}
									isSelected={
										selectedHospital?.id === hospital.id ||
										(!selectedHospital && hospital === topHospitals[0])
									}
									isDarkMode={isDarkMode}
									onPress={onBedPress}
								/>
							))}
						</View>
					) : null}
				</BottomSheetScrollView>
			</BottomSheet>
		</View>
	);
}

/* ── Map layer styles ──────────────────────────────────────── */
const mapStyles = StyleSheet.create({
	root: {
		flex: 1,
	},
	mapBackdrop: {
		...StyleSheet.absoluteFillObject,
		overflow: "hidden",
	},
	fullMapFill: {
		...StyleSheet.absoluteFillObject,
	},
	sheetShadow: {
		shadowColor: "#000000",
		shadowOpacity: 0.18,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: -8 },
		elevation: 16,
	},
	findingAmbientWrap: {
		...StyleSheet.absoluteFillObject,
	},
	findingHaloOuter: {
		...StyleSheet.absoluteFillObject,
	},
	findingHaloMiddle: {
		...StyleSheet.absoluteFillObject,
	},
	findingHaloInner: {
		...StyleSheet.absoluteFillObject,
	},
});

/* ── Sheet content styles ──────────────────────────────────── */
const sheetStyles = StyleSheet.create({
	handleContainer: {
		alignItems: "center",
		paddingTop: 10,
		paddingBottom: 6,
	},
	grabber: {
		width: 38,
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.55)",
	},
	background: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		...StyleSheet.absoluteFillObject,
	},
	scrollContent: {
		paddingHorizontal: 18,
		paddingBottom: 40,
	},
	locationHeader: {
		paddingTop: 4,
		paddingBottom: 12,
		gap: 4,
	},
	locationEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.9,
		textTransform: "uppercase",
	},
	locationTitle: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	locationSupport: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "500",
	},
	searchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 11,
		borderRadius: 12,
		marginBottom: 18,
	},
	searchPlaceholder: {
		flex: 1,
		fontSize: 15,
		lineHeight: 20,
	},
	intentRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: 12,
		marginBottom: 6,
	},
	intentButton: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 20,
		borderRadius: 18,
		gap: 8,
	},
	intentIconWrap: {
		width: 60,
		height: 60,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	intentLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	findingCard: {
		gap: 10,
		paddingVertical: 8,
	},
	findingRailTrack: {
		height: 5,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.22)",
		overflow: "hidden",
		justifyContent: "center",
	},
	findingRailBar: {
		width: 52,
		height: 5,
		borderRadius: 999,
	},
	findingStatusText: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "600",
	},
	skeletonCard: {
		gap: 10,
		paddingVertical: 8,
	},
	skeletonLineLong: {
		height: 12,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.18)",
		width: "70%",
	},
	skeletonLineShort: {
		height: 12,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.12)",
		width: "40%",
	},
	hospitalsSection: {
		marginTop: 22,
		gap: 2,
	},
	sectionTitle: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginBottom: 8,
		paddingHorizontal: 2,
	},
	hospitalRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderRadius: 14,
	},
	hospitalIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalInfo: {
		flex: 1,
		gap: 2,
	},
	hospitalName: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "600",
	},
	hospitalMeta: {
		fontSize: 12,
		lineHeight: 16,
	},
});
