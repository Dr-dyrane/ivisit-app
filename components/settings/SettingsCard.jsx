import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import {
	getMiniProfileColors,
	getMiniProfileLayout,
	getMiniProfileTones,
} from "../emergency/miniProfile/miniProfile.model";

// PULLBACK NOTE: Create SettingsGroup component to match mini profile grouping structure
// OLD: Each card had its own container with background and border radius
// NEW: Group container wraps multiple rows with shared background and dividers
// REASON: Match mini profile's structure where grouped items share a shell/container
export function SettingsGroup({ children, style }) {
	const { isDarkMode } = useTheme();
	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const layout = getMiniProfileLayout({});

	return (
		<View
			style={[
				{
					backgroundColor: miniProfileColors.card,
					borderRadius: layout.groups.radius,
					borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
					overflow: "hidden",
				},
				style,
			]}
		>
			{children}
		</View>
	);
}

// SettingsCard - Reusable card component for settings items (row within group)
// PULLBACK NOTE: Restructure to match mini profile exactly (padding on TouchableOpacity, divider on content)
// OLD: Padding on orb and content View separately
// NEW: Padding on TouchableOpacity, content View has no padding
// REASON: Match mini profile where divider touches right edge of surface
export function SettingsCard({
	iconName,
	title,
	rightElement,
	onPress,
	disabled = false,
	destructive = false,
	tone = "system",
	isLast = false,
	style,
}) {
	const { isDarkMode } = useTheme();
	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const miniProfileTones = getMiniProfileTones(isDarkMode);
	const layout = getMiniProfileLayout({});

	const toneColors = destructive ? miniProfileTones.destructive : miniProfileTones[tone] || miniProfileTones.system;

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			style={[
				{
					flexDirection: "row",
					alignItems: "center",
					minHeight: layout.row.minHeight,
					paddingLeft: layout.row.paddingLeft,
					paddingRight: layout.row.paddingRight,
					backgroundColor: "transparent",
					opacity: disabled ? 0.5 : 1,
				},
				style,
			]}
		>
			<View
				style={{
					width: layout.row.orbSize,
					height: layout.row.orbSize,
					borderRadius: 999,
					backgroundColor: toneColors.bg,
					alignItems: "center",
					justifyContent: "center",
					marginRight: layout.row.orbGap,
				}}
			>
				<Ionicons name={iconName} size={layout.row.iconSize} color={toneColors.icon} />
			</View>
			<View
				style={{
					flex: 1,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					minHeight: layout.row.minHeight,
					gap: layout.row.contentGap,
					borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
					borderBottomColor: miniProfileColors.divider,
				}}
			>
				<Text
					style={{
						flex: 1,
						fontSize: layout.row.labelSize,
						fontWeight: layout.row.labelWeight,
						color: destructive ? miniProfileColors.dangerText : miniProfileColors.text,
						lineHeight: layout.row.labelLineHeight,
						letterSpacing: -0.12,
					}}
					numberOfLines={1}
				>
					{title}
				</Text>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
					{rightElement}
				</View>
			</View>
		</TouchableOpacity>
	);
}

// SettingsToggle - Reusable toggle switch component
// PULLBACK NOTE: Updated to match mini profile design system
// OLD: Bold brandPrimary color, larger toggle (44x24), strong shadow
// NEW: Muted color, smaller toggle (40x22), no shadow, more subtle
// REASON: Match mini profile's refined, subtle design voice
export function SettingsToggle({ value, onToggle, disabled = false }) {
	const { isDarkMode } = useTheme();

	return (
		<View
			style={{
				width: 40,
				height: 22,
				borderRadius: 11,
				borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
				backgroundColor: value ? COLORS.brandPrimary : "#D1D5DB",
				justifyContent: "center",
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<View
				style={{
					width: 18,
					height: 18,
					borderRadius: 9,
					backgroundColor: "#FFFFFF",
					position: "absolute",
					left: value ? 22 : 2,
				}}
			/>
		</View>
	);
}

// SettingsChevron - Reusable chevron navigation button
// PULLBACK NOTE: Updated to match mini profile design system
// OLD: Larger chevron button (32x32) with background
// NEW: Smaller, simpler chevron (size 17) matching mini profile
// REASON: Match mini profile's refined, subtle design voice
export function SettingsChevron({ isDarkMode }) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const layout = getMiniProfileLayout({});

	return (
		<Ionicons
			name="chevron-forward"
			size={layout.row.chevronSize}
			color={miniProfileColors.subtle}
		/>
	);
}

// SettingsSectionHeading - Reusable section heading component
// PULLBACK NOTE: Updated to match mini profile design system
// OLD: Bold heading (fontWeight 700, letterSpacing 0.5, capitalize)
// NEW: More subtle heading (fontWeight 600, no letterSpacing, no textTransform)
// REASON: Match mini profile's refined, subtle design voice
export function SettingsSectionHeading({ title, isDarkMode }) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);

	return (
		<Text
			style={{
				fontSize: 13,
				fontWeight: "600",
				color: miniProfileColors.muted,
				marginBottom: 12,
				letterSpacing: 0,
				textTransform: "none",
			}}
		>
			{title}
		</Text>
	);
}
