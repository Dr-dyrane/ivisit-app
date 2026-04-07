import React from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";
import AmbulanceTierProductGraphic from "./AmbulanceTierProductGraphic";
import { getAmbulanceVisualProfile } from "./ambulanceTierVisuals";

const { width } = Dimensions.get("window");

export default function AmbulanceTypeCard({
	type,
	selected,
	onPress,
	textColor,
	mutedColor,
	interactive = true,
	showCheckmark = true,
	statusLine = null,
	badgeLabel = null,
}) {
	const { isDarkMode } = useTheme();
	const isAndroid = Platform.OS === "android";

	// Dynamic Styles based on your logic
	const activeBG = selected
		? (isAndroid
			? (isDarkMode ? "rgba(134, 16, 14, 0.18)" : "rgba(134, 16, 14, 0.08)")
			: (isDarkMode ? "rgba(134, 16, 14, 0.14)" : "rgba(134, 16, 14, 0.06)"))
		: (isAndroid
			? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(255, 255, 255, 0.78)")
			: (isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.03)"));
	const shadowLayerColor = selected
		? (isDarkMode ? "rgba(134, 16, 14, 0.14)" : "rgba(134, 16, 14, 0.08)")
		: (isDarkMode ? "rgba(0, 0, 0, 0.18)" : "rgba(15, 23, 42, 0.08)");
	const staticSurfaceColor = selected
		? (isDarkMode ? "rgba(134, 16, 14, 0.16)" : "rgba(134, 16, 14, 0.08)")
		: activeBG;
	const visualProfile = getAmbulanceVisualProfile(type);
	const cardContent = (
		<>
			{isAndroid && (
				<View
					pointerEvents="none"
					style={[styles.androidShadowLayer, { backgroundColor: shadowLayerColor }]}
				/>
			)}

			{/* Top Row: Icon and Price */}
			<View style={styles.header}>
				<View
					style={[
						styles.visualShell,
						{
							backgroundColor: isDarkMode
								? `${visualProfile.accent}22`
								: `${visualProfile.accent}14`,
						},
					]}
				>
					<AmbulanceTierProductGraphic type={type} width={60} height={44} />
					<View
						style={[
							styles.visualIconBadge,
							{
								backgroundColor: selected
									? COLORS.brandPrimary
									: isDarkMode
										? "rgba(15,23,42,0.82)"
										: "rgba(255,255,255,0.92)",
							},
						]}
					>
						<Ionicons
							name={type.icon}
							size={12}
							color={selected ? "#FFFFFF" : visualProfile.accent}
						/>
					</View>
				</View>

				<View style={styles.headerRight}>
					{badgeLabel ? (
						<View style={styles.badgePill}>
							<Text style={styles.badgeText}>{badgeLabel}</Text>
						</View>
					) : null}
					<View style={styles.priceContainer}>
						<Text style={[styles.priceLabel, { color: mutedColor }]}>Base fare</Text>
						<Text style={[styles.priceValue, { color: textColor }]}>
							{type.price}
						</Text>
					</View>
				</View>
			</View>

			{/* Middle: Title & Description */}
			<View style={styles.content}>
				<Text style={[styles.tierEyebrow, { color: visualProfile.accent }]}>
					{visualProfile.label}
				</Text>
				{statusLine ? (
					<Text style={[styles.statusLine, { color: selected ? "#FDE68A" : COLORS.brandPrimary }]}>
						{statusLine}
					</Text>
				) : null}
				<Text style={[styles.name, { color: textColor }]}>
					{type.name || type.title}
				</Text>
				<Text
					style={[styles.description, { color: mutedColor }]}
					numberOfLines={2}
				>
					{type.description || type.subtitle}
				</Text>
			</View>

			{/* Bottom: Meta Info and Selection Checkmark */}
			<View style={styles.footer}>
				<View style={styles.pillContainer}>
					<View
						style={[
							styles.pill,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.05)"
									: "rgba(0,0,0,0.03)",
							},
						]}
					>
						<Ionicons
							name="time-outline"
							size={14}
							color={selected ? COLORS.brandPrimary : mutedColor}
						/>
						<Text
							style={[
								styles.pillText,
								{ color: selected ? COLORS.brandPrimary : textColor },
							]}
						>
							{type.eta}
						</Text>
					</View>
					<View
						style={[
							styles.pill,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.05)"
									: "rgba(0,0,0,0.03)",
							},
						]}
					>
						<Ionicons name="people-outline" size={14} color={mutedColor} />
						<Text style={[styles.pillText, { color: textColor }]}>{type.crew || "1-2"}</Text>
					</View>
				</View>

				{/* The Checkmark - Occupying bottom right corner */}
				{interactive ? (
					<View style={styles.chevronHint}>
						<Ionicons name="chevron-forward" size={18} color={mutedColor} />
					</View>
				) : selected && showCheckmark ? (
					<View style={styles.checkmarkWrapper}>
						<Ionicons
							name="checkmark-circle"
							size={32}
							color={COLORS.brandPrimary}
						/>
					</View>
				) : null}
			</View>
		</>
	);

	if (!interactive) {
		return (
			<View
				style={[
					styles.card,
					styles.staticCard,
					{
						backgroundColor: staticSurfaceColor,
						shadowColor: selected ? COLORS.brandPrimary : "#000",
						shadowOpacity: isAndroid ? 0 : (isDarkMode ? 0.08 : 0.04),
						elevation: 0,
					},
				]}
			>
				{cardContent}
			</View>
		);
	}

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: activeBG,
					transform: [{ scale: pressed ? 0.98 : 1 }],
					shadowColor: selected ? COLORS.brandPrimary : "#000",
					shadowOpacity: isAndroid ? 0 : (isDarkMode ? 0.15 : 0.08),
					elevation: isAndroid ? 0 : (selected ? 10 : 2),
				},
			]}
		>
			{cardContent}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		width: "100%",
		padding: 20,
		borderRadius: 28,
		marginBottom: 12,
		minHeight: 172,
		justifyContent: "space-between",
		position: "relative",
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 18,
	},
	androidShadowLayer: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 36,
	},
	staticCard: {
		marginBottom: 12,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	headerRight: {
		alignItems: "flex-end",
		gap: 8,
	},
	visualShell: {
		width: 72,
		height: 72,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
		overflow: "hidden",
	},
	visualImage: {
		width: 60,
		height: 60,
	},
	visualIconBadge: {
		position: "absolute",
		right: 6,
		top: 6,
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
	},
	priceContainer: {
		alignItems: "flex-end",
	},
	badgePill: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.14)",
	},
	badgeText: {
		color: "#FFFFFF",
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.4,
	},
	priceLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.2,
		marginBottom: 2,
	},
	priceValue: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.8,
	},
	content: {
		marginTop: 12,
	},
	tierEyebrow: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.4,
		marginBottom: 4,
	},
	statusLine: {
		fontSize: 15,
		fontWeight: "800",
		marginBottom: 6,
	},
	name: {
		fontSize: 20,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
		maxWidth: "96%",
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 16,
	},
	pillContainer: {
		flexDirection: "row",
		gap: 8,
	},
	pill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
		gap: 6,
	},
	pillText: {
		fontSize: 12,
		fontWeight: "700",
	},
	chevronHint: {
		paddingLeft: 8,
		paddingVertical: 6,
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.3,
		shadowRadius: 10,
	},
});
