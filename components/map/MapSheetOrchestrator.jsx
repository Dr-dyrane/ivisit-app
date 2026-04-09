import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	Image,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { getMapSheetTokens } from "./mapSheetTokens";
import { MAP_CARE_PULSE_MS, MAP_SHEET_SNAP_SPRING } from "./mapMotionTokens";

export const MAP_SHEET_MODES = {
	EXPLORE_INTENT: "explore_intent",
	HOSPITAL_PREVIEW: "hospital_preview",
	AMBULANCE_DECISION: "ambulance_decision",
	BED_DECISION: "bed_decision",
	COMMIT_DETAILS: "commit_details",
	COMMIT_AUTH: "commit_auth",
	COMMIT_PAYMENT: "commit_payment",
	TRACKING: "tracking",
};

export const MAP_SHEET_SNAP_STATES = {
	COLLAPSED: "collapsed",
	HALF: "half",
	EXPANDED: "expanded",
};

const MAP_SHEET_SNAP_INDEX = {
	[MAP_SHEET_SNAP_STATES.COLLAPSED]: 0,
	[MAP_SHEET_SNAP_STATES.HALF]: 1,
	[MAP_SHEET_SNAP_STATES.EXPANDED]: 2,
};

export function getMapSheetHeight(screenHeight, snapState) {
	switch (snapState) {
		case MAP_SHEET_SNAP_STATES.COLLAPSED:
			return 156;
		case MAP_SHEET_SNAP_STATES.EXPANDED:
			return Math.max(500, Math.min(screenHeight * 0.82, 760));
		case MAP_SHEET_SNAP_STATES.HALF:
		default:
			return Math.max(360, Math.min(screenHeight * 0.5, 460));
	}
}

function MapSheetProfileTrigger({ onPress, userImageSource, isSignedIn }) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.avatarPressable,
				{ transform: [{ scale: pressed ? 0.96 : 1 }] },
			]}
		>
			<Image
				source={userImageSource}
				resizeMode="cover"
				style={[
					styles.avatarImage,
					{
						shadowColor: "#000000",
						shadowOpacity: 0.16,
						shadowRadius: 12,
						shadowOffset: { width: 0, height: 6 },
						...Platform.select({
							web: {
								boxShadow: "0px 10px 18px rgba(15,23,42,0.18)",
							},
						}),
					},
				]}
			/>
			{isSignedIn ? <View style={styles.avatarDot} /> : null}
		</Pressable>
	);
}

function MapSheetShell({
	sheetHeight,
	snapState,
	topSlot = null,
	footerSlot = null,
	children,
}) {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const snapProgress = useRef(
		new Animated.Value(MAP_SHEET_SNAP_INDEX[snapState] ?? MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF]),
	).current;

	useEffect(() => {
		Animated.spring(snapProgress, {
			toValue:
				MAP_SHEET_SNAP_INDEX[snapState] ??
				MAP_SHEET_SNAP_INDEX[MAP_SHEET_SNAP_STATES.HALF],
			useNativeDriver: false,
			...MAP_SHEET_SNAP_SPRING,
		}).start();
	}, [snapProgress, snapState]);

	const sideInset = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [16, tokens.islandMargin, 0],
	});
	const bottomInset = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [18, tokens.islandMargin, 0],
	});
	const topRadius = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [34, tokens.sheetRadius, 34],
	});
	const bottomRadius = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [34, tokens.sheetRadius, 0],
	});
	const handleWidth = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [54, 48, 46],
	});
	const horizontalPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [14, 12, 18],
	});
	const topPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [10, 10, 14],
	});
	const bottomPadding = snapProgress.interpolate({
		inputRange: [0, 1, 2],
		outputRange: [10, 12, 18],
	});

	return (
		<Animated.View
			style={[
				styles.sheetHost,
				tokens.shadowStyle,
				{
					left: sideInset,
					right: sideInset,
					bottom: bottomInset,
					height: sheetHeight,
					borderTopLeftRadius: topRadius,
					borderTopRightRadius: topRadius,
					borderBottomLeftRadius: bottomRadius,
					borderBottomRightRadius: bottomRadius,
				},
			]}
		>
			{isAndroid ? (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.sheetUnderlay,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassUnderlay,
						},
					]}
				/>
			) : null}

			<Animated.View
				style={[
					styles.sheetClip,
					{
						borderTopLeftRadius: topRadius,
						borderTopRightRadius: topRadius,
						borderBottomLeftRadius: bottomRadius,
						borderBottomRightRadius: bottomRadius,
						backgroundColor: isAndroid ? tokens.glassSurface : "transparent",
					},
				]}
			>
				{Platform.OS === "ios" ? (
					<BlurView
						intensity={tokens.blurIntensity}
						tint={isDarkMode ? "dark" : "light"}
						style={StyleSheet.absoluteFill}
					/>
				) : null}

				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassBackdrop,
						},
					]}
				/>
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderTopLeftRadius: topRadius,
							borderTopRightRadius: topRadius,
							borderBottomLeftRadius: bottomRadius,
							borderBottomRightRadius: bottomRadius,
							backgroundColor: tokens.glassOverlay,
						},
					]}
				/>

				<Animated.View
					style={[
						styles.sheetContent,
						{
							paddingHorizontal: horizontalPadding,
							paddingTop: topPadding,
							paddingBottom: bottomPadding,
						},
					]}
				>
					<Animated.View
						style={[
							styles.handle,
							{ width: handleWidth, backgroundColor: tokens.handleColor },
						]}
					/>
					{topSlot}
					<View style={styles.contentViewport}>{children}</View>
					{footerSlot}
				</Animated.View>
			</Animated.View>
		</Animated.View>
	);
}

function CareIntentOrb({
	label,
	subtext,
	iconName,
	colors,
	hierarchy = "secondary",
	onPress,
	isSelected = false,
	titleColor,
	mutedColor,
	pulseProgress = null,
}) {
	const animatedScale =
		hierarchy === "primary" && pulseProgress
			? pulseProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [1, 1.03],
				})
			: 1;
	const wrapperOpacity =
		hierarchy === "primary" ? 1 : hierarchy === "secondary" ? 0.84 : 0.68;
	const shadowOpacity =
		hierarchy === "primary" ? 0.26 : hierarchy === "secondary" ? 0.12 : 0.06;
	const shadowRadius =
		hierarchy === "primary" ? 24 : hierarchy === "secondary" ? 12 : 6;
	const shadowOffset = hierarchy === "primary" ? 14 : hierarchy === "secondary" ? 8 : 4;
	const elevation = hierarchy === "primary" ? 12 : hierarchy === "secondary" ? 5 : 2;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.careAction,
				pressed ? styles.careActionPressed : null,
				{ opacity: pressed ? Math.max(wrapperOpacity - 0.08, 0.54) : wrapperOpacity },
			]}
		>
			<Animated.View
				style={{
					transform: [{ scale: isSelected ? 1.05 : animatedScale }],
				}}
			>
				<LinearGradient
					colors={colors}
					start={{ x: 0.18, y: 0.18 }}
					end={{ x: 0.82, y: 0.9 }}
					style={[
						styles.careIconWrap,
						{
							shadowColor: "#000000",
							shadowOpacity,
							shadowRadius,
							shadowOffset: { width: 0, height: shadowOffset },
							elevation,
							...Platform.select({
								web: {
									boxShadow:
										hierarchy === "primary"
											? "0px 18px 30px rgba(15,23,42,0.24)"
											: hierarchy === "secondary"
												? "0px 10px 16px rgba(15,23,42,0.14)"
												: "0px 5px 9px rgba(15,23,42,0.08)",
								},
							}),
						},
					]}
				>
					<MaterialCommunityIcons name={iconName} size={38} color="#FFFFFF" />
				</LinearGradient>
			</Animated.View>
			<Text
				style={[
					styles.careLabel,
					{
						color:
							hierarchy === "primary"
								? titleColor
								: hierarchy === "secondary"
									? mutedColor
									: mutedColor,
					},
				]}
			>
				{label}
			</Text>
			<Text
				style={[
					styles.careSubtext,
					{
						color:
							hierarchy === "primary"
								? mutedColor
								: hierarchy === "secondary"
									? mutedColor
									: mutedColor,
					},
				]}
			>
				{subtext}
			</Text>
		</Pressable>
	);
}

function MapExploreIntentSheet({
	sheetHeight,
	snapState,
	nearestHospital,
	nearestHospitalMeta,
	selectedCare,
	onOpenSearch,
	onOpenHospitals,
	onChooseCare,
	onOpenProfile,
	onOpenCareHistory,
	profileImageSource,
	isSignedIn,
	nearbyHospitalCount,
	totalAvailableBeds,
	nearbyBedHospitals,
}) {
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const pulseProgress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseProgress, {
					toValue: 1,
					duration: MAP_CARE_PULSE_MS,
					useNativeDriver: true,
				}),
				Animated.timing(pulseProgress, {
					toValue: 0,
					duration: MAP_CARE_PULSE_MS,
					useNativeDriver: true,
				}),
			]),
		);
		pulseLoop.start();

		return () => {
			pulseLoop.stop();
			pulseProgress.stopAnimation();
		};
	}, [pulseProgress]);

	const topRow = (
		<View style={styles.topRow}>
			<Pressable
				onPress={onOpenSearch}
				style={[
					styles.searchPill,
					{
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.searchSurface,
					},
				]}
			>
				<Ionicons name="search" size={20} color={tokens.titleColor} />
				<Text style={[styles.searchText, { color: tokens.titleColor }]}>Search</Text>
			</Pressable>

			<MapSheetProfileTrigger
				onPress={onOpenProfile}
				userImageSource={profileImageSource}
				isSignedIn={isSignedIn}
			/>
		</View>
	);

	return (
		<MapSheetShell sheetHeight={sheetHeight} snapState={snapState} topSlot={topRow}>
			<Pressable
				onPress={onOpenHospitals}
				style={[
					styles.hospitalCard,
					{
						borderRadius: tokens.cardRadius,
						backgroundColor: tokens.strongCardSurface,
					},
				]}
			>
				<View
					style={[
						styles.hospitalIconWrap,
						{
							borderRadius: tokens.cardRadius - 10,
							backgroundColor: tokens.mutedCardSurface,
						},
					]}
				>
					<MaterialCommunityIcons
						name="hospital-building"
						size={18}
						color={isDarkMode ? "#F8FAFC" : "#86100E"}
					/>
				</View>
				<View style={styles.hospitalCardCopy}>
					<Text style={[styles.hospitalEyebrow, { color: tokens.mutedText }]}>
						Nearest hospital
					</Text>
					<Text numberOfLines={1} style={[styles.hospitalTitle, { color: tokens.titleColor }]}>
						{nearestHospital?.name || "Finding nearest hospital"}
					</Text>
					<Text numberOfLines={1} style={[styles.hospitalMeta, { color: tokens.bodyText }]}>
						{nearestHospitalMeta.join(" | ") || "Tap to see nearby hospitals"}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={18} color={tokens.mutedText} />
			</Pressable>

			<Pressable
				onPress={onOpenCareHistory}
				style={({ pressed }) => [
					styles.sectionTrigger,
					pressed ? styles.sectionTriggerPressed : null,
				]}
			>
				<Text style={[styles.sectionLabel, { color: tokens.mutedText }]}>Choose care</Text>
				<Ionicons name="chevron-forward" size={16} color={tokens.mutedText} />
			</Pressable>

			<View style={styles.careRow}>
				<CareIntentOrb
					label="Ambulance"
					subtext={nearbyHospitalCount > 0 ? `${nearbyHospitalCount} nearby` : "Nearby help"}
					iconName="ambulance"
					colors={["#A11217", "#6D080D"]}
					hierarchy="primary"
					onPress={() => onChooseCare("ambulance")}
					isSelected={selectedCare === "ambulance"}
					titleColor={tokens.titleColor}
					mutedColor={tokens.mutedText}
					pulseProgress={pulseProgress}
				/>

				<CareIntentOrb
					label="Bed space"
					subtext={
						totalAvailableBeds > 0
							? `${totalAvailableBeds} available`
							: nearbyBedHospitals > 0
								? `${nearbyBedHospitals} nearby`
								: "Nearby beds"
					}
					iconName="bed"
					colors={["#6F8DA7", "#506A86"]}
					hierarchy="secondary"
					onPress={() => onChooseCare("bed")}
					isSelected={selectedCare === "bed"}
					titleColor={tokens.titleColor}
					mutedColor={tokens.mutedText}
				/>

				<CareIntentOrb
					label="Compare"
					subtext="All options"
					iconName="format-list-bulleted"
					colors={["#7A8592", "#596370"]}
					hierarchy="tertiary"
					onPress={onOpenCareHistory}
					titleColor={tokens.titleColor}
					mutedColor={tokens.mutedText}
				/>
			</View>
		</MapSheetShell>
	);
}

export default function MapSheetOrchestrator({
	mode = MAP_SHEET_MODES.EXPLORE_INTENT,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	screenHeight,
	nearestHospital,
	nearestHospitalMeta = [],
	selectedCare = null,
	onOpenSearch,
	onOpenHospitals,
	onChooseCare,
	onOpenProfile,
	onOpenCareHistory = () => {},
	profileImageSource,
	isSignedIn = false,
	nearbyHospitalCount = 0,
	totalAvailableBeds = 0,
	nearbyBedHospitals = 0,
}) {
	const sheetHeight = useMemo(
		() => getMapSheetHeight(screenHeight, snapState),
		[screenHeight, snapState],
	);

	switch (mode) {
		case MAP_SHEET_MODES.EXPLORE_INTENT:
		default:
			return (
				<MapExploreIntentSheet
					sheetHeight={sheetHeight}
					snapState={snapState}
					nearestHospital={nearestHospital}
					nearestHospitalMeta={nearestHospitalMeta}
					selectedCare={selectedCare}
					onOpenSearch={onOpenSearch}
					onOpenHospitals={onOpenHospitals}
					onChooseCare={onChooseCare}
					onOpenProfile={onOpenProfile}
					onOpenCareHistory={onOpenCareHistory}
					profileImageSource={
						profileImageSource || require("../../assets/profile.jpg")
					}
					isSignedIn={isSignedIn}
					nearbyHospitalCount={nearbyHospitalCount}
					totalAvailableBeds={totalAvailableBeds}
					nearbyBedHospitals={nearbyBedHospitals}
				/>
			);
	}
}

const styles = StyleSheet.create({
	sheetHost: {
		position: "absolute",
		overflow: "visible",
	},
	sheetUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
	},
	sheetClip: {
		flex: 1,
		overflow: "hidden",
		borderCurve: "continuous",
	},
	sheetContent: {
		flex: 1,
	},
	handle: {
		alignSelf: "center",
		height: 5,
		borderRadius: 999,
		marginBottom: 12,
	},
	contentViewport: {
		flex: 1,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 16,
	},
	searchPill: {
		flex: 1,
		minHeight: 52,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	searchText: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: "700",
	},
	avatarPressable: {
		width: 44,
		height: 44,
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	avatarImage: {
		width: 42,
		height: 42,
		borderRadius: 21,
	},
	avatarDot: {
		position: "absolute",
		bottom: 2,
		right: 1,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: "#10B981",
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	hospitalCard: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		marginBottom: 22,
	},
	hospitalIconWrap: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalCardCopy: {
		flex: 1,
	},
	hospitalEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.8,
		textTransform: "uppercase",
	},
	hospitalTitle: {
		marginTop: 4,
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	hospitalMeta: {
		marginTop: 4,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "500",
	},
	sectionTrigger: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		alignSelf: "flex-start",
		marginBottom: 18,
	},
	sectionTriggerPressed: {
		opacity: 0.78,
	},
	sectionLabel: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	careRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 10,
	},
	careAction: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
		paddingVertical: 2,
		paddingHorizontal: 1,
	},
	careActionPressed: {
		opacity: 0.88,
	},
	careIconWrap: {
		width: 88,
		height: 88,
		borderRadius: 44,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	careLabel: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "800",
		textAlign: "center",
	},
	careSubtext: {
		marginTop: 3,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		textAlign: "center",
	},
});
