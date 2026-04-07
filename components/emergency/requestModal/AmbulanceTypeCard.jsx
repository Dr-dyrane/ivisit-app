import React from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

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
			? (isDarkMode ? "rgba(134, 16, 14, 0.24)" : "rgba(134, 16, 14, 0.12)")
			: (isDarkMode ? COLORS.brandPrimary + "20" : COLORS.brandPrimary + "15"))
		: (isAndroid
			? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(255, 255, 255, 0.78)")
			: (isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"));
	const shadowLayerColor = selected
		? (isDarkMode ? "rgba(134, 16, 14, 0.20)" : "rgba(134, 16, 14, 0.12)")
		: (isDarkMode ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.10)");

	return (
		<Pressable
			onPress={interactive ? onPress : undefined}
			disabled={!interactive}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: activeBG,
					transform: [{ scale: interactive && pressed ? 0.98 : 1 }],
					// Using shadow instead of borders for depth
					shadowColor: selected ? COLORS.brandPrimary : "#000",
					shadowOpacity: isAndroid ? 0 : (isDarkMode ? 0.15 : 0.08),
					elevation: isAndroid ? 0 : (selected ? 10 : 2),
					opacity: interactive ? 1 : 0.98,
				},
			]}
		>
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
						styles.iconBox,
						{
							backgroundColor: selected
								? COLORS.brandPrimary
								: isDarkMode
								? "#1E293B"
								: "#F1F5F9",
						},
					]}
				>
					<Ionicons
						name={type.icon}
						size={26}
						color={selected ? "#FFFFFF" : isDarkMode ? "#94A3B8" : "#64748B"}
					/>
				</View>

				<View style={styles.headerRight}>
					{badgeLabel ? (
						<View style={styles.badgePill}>
							<Text style={styles.badgeText}>{badgeLabel}</Text>
						</View>
					) : null}
					<View style={styles.priceContainer}>
						<Text style={[styles.priceLabel, { color: mutedColor }]}>
							Estimated cost
						</Text>
						<Text style={[styles.priceValue, { color: textColor }]}>
							{type.price}
						</Text>
					</View>
				</View>
			</View>

			{/* Middle: Title & Description */}
			<View style={styles.content}>
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
				{selected && showCheckmark && (
					<View style={styles.checkmarkWrapper}>
						<Ionicons
							name="checkmark-circle"
							size={32}
							color={COLORS.brandPrimary}
						/>
					</View>
				)}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		width: "100%",
		padding: 24,
		borderRadius: 36, // Maximum roundness
		marginBottom: 16,
		minHeight: 190, // Increased vertical space
		justifyContent: "space-between",
		position: "relative",
		// Note: No borders applied as per request
		shadowOffset: { width: 0, height: 12 },
		shadowRadius: 16,
	},
	androidShadowLayer: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 36,
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
	iconBox: {
		width: 54,
		height: 54,
		borderRadius: 20,
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
		textTransform: "uppercase",
		fontWeight: "700",
		letterSpacing: 1,
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
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
		// Adding a small glow to the checkmark if needed
		shadowColor: COLORS.brandPrimary,
		shadowOpacity: 0.3,
		shadowRadius: 10,
	},
});
