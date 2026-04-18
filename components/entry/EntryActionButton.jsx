import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export default function EntryActionButton({
	label,
	onPress,
	onPressIn,
	onPressOut,
	variant = "primary",
	height = 60,
	radius = null,
	fullWidth = true,
	iconName = null,
	disabled = false,
	loading = false,
	maxWidth = null,
	minWidth = null,
	style,
	accessibilityLabel,
	accessibilityHint,
}) {
	const { isDarkMode } = useTheme();
	const isPrimary = variant === "primary";
	const resolvedRadius = Number.isFinite(radius) ? radius : Math.round(height / 2);

	const backgroundColor = isDarkMode ? "#0E1522" : "#F6F0EF";
	const primaryGradient = isDarkMode
		? ["#941412", COLORS.brandPrimary]
		: ["#A11412", COLORS.brandPrimary];
	const secondaryGradient = isDarkMode
		? ["rgba(31, 40, 58, 0.98)", "rgba(20, 27, 40, 0.98)"]
		: ["#F7F0F0", "#F2E6E6"];
	const textColor = isPrimary
		? "#FFFFFF"
		: isDarkMode
			? "#F8FAFC"
			: "#111827";

	return (
		<Pressable
			onPress={onPress}
			onPressIn={onPressIn}
			onPressOut={onPressOut}
			disabled={disabled || loading}
			accessible
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || label}
			accessibilityHint={accessibilityHint}
			focusable={Platform.OS === "web" ? true : undefined}
			style={({ pressed, focused }) => [
				styles.base,
				{
					width: fullWidth ? "100%" : "auto",
					maxWidth: maxWidth ?? undefined,
					minWidth: minWidth ?? undefined,
					minHeight: height,
					backgroundColor,
					borderRadius: resolvedRadius,
					borderCurve: "continuous",
					opacity: disabled || loading ? 0.78 : pressed ? 0.98 : 1,
					transform: [{ scale: pressed ? 0.985 : 1 }, { translateY: pressed ? 1 : 0 }],
					shadowColor: "#0F172A",
					shadowOpacity:
						focused && Platform.OS === "web"
							? Math.max(
								isPrimary ? (isDarkMode ? 0.34 : 0.24) : isDarkMode ? 0.18 : 0.05,
								0.16,
							)
							: isPrimary
								? (isDarkMode ? 0.28 : 0.18)
								: isDarkMode
									? 0.18
									: 0.05,
					shadowRadius:
						focused && Platform.OS === "web"
							? (isPrimary ? 28 : 26)
							: (isPrimary ? 24 : 20),
					shadowOffset:
						focused && Platform.OS === "web"
							? { width: 0, height: isPrimary ? 18 : 14 }
							: isPrimary
								? { width: 0, height: 16 }
								: { width: 0, height: 14 },
					elevation: isPrimary ? 10 : 4,
				},
				style,
				Platform.OS === "web" ? styles.cursor : null,
			]}
		>
			<LinearGradient
				colors={isPrimary ? primaryGradient : secondaryGradient}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={[styles.fill, { borderRadius: resolvedRadius, borderCurve: "continuous" }]}
			>
				<View
					pointerEvents="none"
					style={[
						styles.highlight,
						{
							borderRadius: resolvedRadius,
							borderCurve: "continuous",
							opacity: isPrimary ? 0.07 : isDarkMode ? 0.06 : 0.1,
						},
					]}
				/>
				<View
					pointerEvents="none"
					style={[
						styles.bottomShade,
						{
							borderBottomLeftRadius: resolvedRadius,
							borderBottomRightRadius: resolvedRadius,
							opacity: isPrimary ? (isDarkMode ? 0.18 : 0.12) : isDarkMode ? 0.1 : 0.05,
						},
					]}
				/>
				<View style={styles.content}>
					{loading ? (
						<View
							style={[
								styles.iconWrap,
								{
									backgroundColor: isPrimary
										? "rgba(255,255,255,0.14)"
										: isDarkMode
											? "rgba(255,255,255,0.06)"
											: "rgba(134,16,14,0.08)",
								},
							]}
						>
							<ActivityIndicator
								size="small"
								color={isPrimary ? "#FFFFFF" : COLORS.brandPrimary}
							/>
						</View>
					) : iconName ? (
						<View
							style={[
								styles.iconWrap,
								{
									backgroundColor: isPrimary
										? "rgba(255,255,255,0.14)"
										: isDarkMode
											? "rgba(255,255,255,0.06)"
											: "rgba(134,16,14,0.08)",
								},
							]}
						>
							<Ionicons
								name={iconName}
								size={18}
								color={isPrimary ? "#FFFFFF" : COLORS.brandPrimary}
							/>
						</View>
					) : null}
					<Text
						style={[
							styles.label,
							{
								color: textColor,
								letterSpacing: -0.25,
								fontWeight: isPrimary ? "800" : "700",
							},
						]}
						numberOfLines={1}
						adjustsFontSizeToFit
						minimumFontScale={0.82}
					>
						{label}
					</Text>
				</View>
			</LinearGradient>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		justifyContent: "center",
		shadowOffset: { width: 0, height: 14 },
		overflow: "visible",
	},
	fill: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 20,
		overflow: "hidden",
	},
	highlight: {
		position: "absolute",
		left: 1,
		right: 1,
		top: 1,
		height: "42%",
		backgroundColor: "#FFFFFF",
	},
	bottomShade: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: "38%",
		backgroundColor: "#120909",
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
	label: {
		fontSize: 17,
		lineHeight: 22,
	},
	iconWrap: {
		width: 32,
		height: 32,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	cursor: {
		cursor: "pointer",
	},
});
