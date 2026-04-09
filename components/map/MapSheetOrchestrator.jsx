import React, { useMemo } from "react";
import {
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
	topSlot = null,
	footerSlot = null,
	children,
}) {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);

	return (
		<View
			style={[
				styles.sheetHost,
				tokens.shadowStyle,
				{
					left: tokens.islandMargin,
					right: tokens.islandMargin,
					bottom: tokens.islandMargin,
					height: sheetHeight,
					borderRadius: tokens.sheetRadius,
				},
			]}
		>
			{isAndroid ? (
				<View
					pointerEvents="none"
					style={[
						styles.sheetUnderlay,
						{
							borderRadius: tokens.sheetRadius,
							backgroundColor: tokens.glassUnderlay,
						},
					]}
				/>
			) : null}

			<View
				style={[
					styles.sheetClip,
					{
						borderRadius: tokens.sheetRadius,
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

				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderRadius: tokens.sheetRadius,
							backgroundColor: tokens.glassBackdrop,
						},
					]}
				/>
				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFillObject,
						{
							borderRadius: tokens.sheetRadius,
							backgroundColor: tokens.glassOverlay,
						},
					]}
				/>

				<View style={styles.sheetContent}>
					<View
						style={[
							styles.handle,
							{ width: 42, backgroundColor: tokens.handleColor },
						]}
					/>
					{topSlot}
					<View style={styles.contentViewport}>{children}</View>
					{footerSlot}
				</View>
			</View>
		</View>
	);
}

function MapExploreIntentSheet({
	sheetHeight,
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
		<MapSheetShell sheetHeight={sheetHeight} topSlot={topRow}>
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
				<Ionicons name="chevron-forward" size={16} color={tokens.mutedText} />
				<Text style={[styles.sectionLabel, { color: tokens.mutedText }]}>Choose care</Text>
			</Pressable>

			<View style={styles.careRow}>
				<Pressable
					onPress={() => onChooseCare("ambulance")}
					style={({ pressed }) => [
						styles.careAction,
						pressed ? styles.careActionPressed : null,
					]}
				>
					<LinearGradient
						colors={["#F97316", "#DC2626"]}
						start={{ x: 0.18, y: 0.18 }}
						end={{ x: 0.82, y: 0.9 }}
						style={[
							styles.careIconWrap,
							selectedCare === "ambulance" ? styles.careIconWrapSelected : null,
						]}
					>
						<View style={styles.careIconHighlight} />
						<MaterialCommunityIcons name="ambulance" size={38} color="#FFFFFF" />
					</LinearGradient>
					<Text style={[styles.careLabel, { color: tokens.titleColor }]}>Ambulance</Text>
					<Text style={[styles.careSubtext, { color: tokens.mutedText }]}>
						{nearbyHospitalCount > 0 ? `${nearbyHospitalCount} nearby` : "Nearby help"}
					</Text>
				</Pressable>

				<Pressable
					onPress={() => onChooseCare("bed")}
					style={({ pressed }) => [
						styles.careAction,
						pressed ? styles.careActionPressed : null,
					]}
				>
					<LinearGradient
						colors={["#38BDF8", "#2563EB"]}
						start={{ x: 0.18, y: 0.18 }}
						end={{ x: 0.82, y: 0.9 }}
						style={[
							styles.careIconWrap,
							selectedCare === "bed" ? styles.careIconWrapSelected : null,
						]}
					>
						<View style={styles.careIconHighlight} />
						<MaterialCommunityIcons name="bed" size={38} color="#FFFFFF" />
					</LinearGradient>
					<Text style={[styles.careLabel, { color: tokens.titleColor }]}>Bed space</Text>
					<Text style={[styles.careSubtext, { color: tokens.mutedText }]}>
						{totalAvailableBeds > 0
							? `${totalAvailableBeds} available`
							: nearbyBedHospitals > 0
								? `${nearbyBedHospitals} nearby`
								: "Nearby beds"}
					</Text>
				</Pressable>

				<Pressable
					onPress={() => onChooseCare("both")}
					style={({ pressed }) => [
						styles.careAction,
						pressed ? styles.careActionPressed : null,
					]}
				>
					<LinearGradient
						colors={["#14B8A6", "#0F766E"]}
						start={{ x: 0.18, y: 0.18 }}
						end={{ x: 0.82, y: 0.9 }}
						style={[
							styles.careIconWrap,
							selectedCare === "both" ? styles.careIconWrapSelected : null,
						]}
					>
						<View style={styles.careIconHighlight} />
						<MaterialCommunityIcons name="hospital-box" size={38} color="#FFFFFF" />
					</LinearGradient>
					<Text style={[styles.careLabel, { color: tokens.titleColor }]}>Both</Text>
					<Text style={[styles.careSubtext, { color: tokens.mutedText }]}>
						{nearbyHospitalCount > 0 ? `${nearbyHospitalCount} options` : "Full support"}
					</Text>
				</Pressable>
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
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 12,
	},
	handle: {
		alignSelf: "center",
		height: 5,
		borderRadius: 999,
		marginBottom: 10,
	},
	contentViewport: {
		flex: 1,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 10,
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
		marginBottom: 12,
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
		marginBottom: 10,
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
		gap: 8,
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
		shadowColor: "#000000",
		shadowOpacity: 0.18,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		...Platform.select({
			web: {
				boxShadow: "0px 14px 26px rgba(15,23,42,0.16)",
			},
		}),
	},
	careIconHighlight: {
		position: "absolute",
		top: 10,
		left: 16,
		width: 34,
		height: 18,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.24)",
	},
	careIconWrapSelected: {
		transform: [{ scale: 1.04 }],
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
		fontWeight: "600",
		textAlign: "center",
	},
});
