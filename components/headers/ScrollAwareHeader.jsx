import React from "react";
import { Animated, View, Text, Platform, StyleSheet } from "react-native";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { BlurView } from "expo-blur";
import { COLORS } from "../../constants/colors";
import NotificationIconButton from "./NotificationIconButton";
import SearchIconButton from "./SearchIconButton";

const HEADER_HEIGHT = 80;

/**
 * ScrollAwareHeader Component (Sticky)
 *
 * Features:
 * - Pure glass/frosted effect with high blur
 * - Minimal opacity for transparency
 * - Fixed at top - doesn't scroll with content
 * - Uses useNativeDriver for 60fps performance
 */
export default function ScrollAwareHeader({
	title,
	subtitle,
	icon,
	backgroundColor = COLORS.brandPrimary,
	badge,
	leftComponent,
	rightComponent,
}) {
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const { headerOpacity, titleOpacity } = useScrollAwareHeader();

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";

	const resolvedRight =
		rightComponent === false ? null : rightComponent == null ? (
			<View style={styles.rightActions}>
				{/* Nested Squircle backgrounds for action buttons */}
				<View style={[styles.actionWrapper, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
					<SearchIconButton />
				</View>
				<View style={[styles.actionWrapper, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
					<NotificationIconButton />
				</View>
			</View>
		) : (
			rightComponent
		);

	return (
		<Animated.View
			style={[
				styles.container,
				{
					opacity: headerOpacity,
					paddingTop: insets.top + 8,
					paddingHorizontal: 12,
				},
			]}
		>
			<View style={styles.islandWrapper}>
				<BlurView
					intensity={isDarkMode ? 80 : 90}
					tint={isDarkMode ? "dark" : "light"}
					style={[styles.blur, { minHeight: HEADER_HEIGHT }]}
				>
					<View style={[styles.innerContent, {
						backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.2)" : "rgba(255, 255, 255, 0.3)"
					}]}>{/* LEFT: Identity / Navigation */}
						<View style={styles.leftSection}>{leftComponent ? leftComponent : icon ? (<View style={[styles.iconSquircle, { backgroundColor: backgroundColor }]}>{icon}</View>) : null}</View>{/* MIDDLE: Editorial Typography */}
						<View style={styles.centerSection}>{subtitle && (<Text numberOfLines={1} style={[styles.subtitleText, { color: textMuted }]}>{subtitle}</Text>)}<Animated.Text numberOfLines={1} style={[styles.titleText, { color: textColor, opacity: titleOpacity }]}>{title}</Animated.Text></View>

						{/* RIGHT: Actions / Badge */}
						<View style={styles.rightSection}>{badge ? (<View style={[styles.badgeBox, { backgroundColor }]}>
							<Text style={styles.badgeText}>{badge}</Text>
						</View>) : resolvedRight}</View>
					</View>
				</BlurView>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 9999,
	},
	islandWrapper: {
		// Floating "Island" feel
		borderRadius: 48,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.12,
		shadowRadius: 16,
		elevation: 10,
		...Platform.select({
			web: {
				boxShadow: "0px 12px 16px rgba(0,0,0,0.12)",
			},
		}),
	},
	blur: {
		borderRadius: 48,
	},
	innerContent: {
		height: HEADER_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20, // Premium breathing room
	},
	leftSection: {
		marginRight: 16,
	},
	iconSquircle: {
		width: 48,
		height: 48,
		borderRadius: 14, // Nested Squircle logic
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.1,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		...Platform.select({
			web: {
				boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
			},
		}),
	},
	centerSection: {
		flex: 1,
		justifyContent: "center",
	},
	subtitleText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginBottom: 2,
	},
	titleText: {
		fontSize: 24, // Editorial size
		fontWeight: "900",
		letterSpacing: -1.0,
	},
	rightSection: {
		marginLeft: 12,
		alignItems: "flex-end",
	},
	rightActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	actionWrapper: {
		width: 42,
		height: 42,
		borderRadius: 14, // Nested Squircle logic
		alignItems: "center",
		justifyContent: "center",
	},
	badgeBox: {
		minWidth: 32,
		height: 32,
		borderRadius: 10, // Match nested squircle vibe
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	badgeText: {
		color: "#FFFFFF",
		fontWeight: "900",
		fontSize: 12,
	},
});