import React from "react";
import { Animated, View, Text, Platform, StyleSheet } from "react-native";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { BlurView } from "expo-blur";
import { COLORS } from "../../constants/colors";
import {
	GLASS_SURFACE_VARIANTS,
	SURFACE_RADII,
	getGlassSurfaceTokens,
} from "../../constants/surfaces";
import NotificationIconButton from "./NotificationIconButton";
import SearchIconButton from "./SearchIconButton";
import ActionWrapper from "./ActionWrapper";

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
	scrollAware = true,
}) {
	const insets = useSafeAreaInsets();
	const { isDarkMode } = useTheme();
	const isIOS = Platform.OS === "ios";
	const isAndroid = Platform.OS === "android";
	const { headerOpacity: scrollHeaderOpacity, titleOpacity: scrollTitleOpacity } = useScrollAwareHeader();
	const headerOpacity = scrollAware ? scrollHeaderOpacity : 1;
	const titleOpacity = scrollAware ? scrollTitleOpacity : 1;
	const headerSurface = getGlassSurfaceTokens({
		isDarkMode,
		variant: GLASS_SURFACE_VARIANTS.HEADER,
	});

	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const textMuted = isDarkMode ? "#94A3B8" : "#64748B";

	const resolvedRight =
		rightComponent === false ? null : rightComponent == null ? (
			<View style={styles.rightActions}>
				<ActionWrapper>
					<SearchIconButton />
				</ActionWrapper>
				<ActionWrapper>
					<NotificationIconButton />
				</ActionWrapper>
			</View>
		) : (
			rightComponent
		);

	const headerContent = (
		<View style={[styles.innerContent, { backgroundColor: headerSurface.overlayColor }]}>
			<View style={styles.leftSection}>
				{leftComponent ? (
					leftComponent
				) : icon ? (
					<View style={[styles.iconSquircle, { backgroundColor }]}>{icon}</View>
				) : null}
			</View>
			<View style={styles.centerSection}>
				{subtitle ? (
					<Text numberOfLines={1} style={[styles.subtitleText, { color: textMuted }]}>
						{subtitle}
					</Text>
				) : null}
				<Animated.Text
					numberOfLines={1}
					style={[styles.titleText, { color: textColor, opacity: titleOpacity }]}
				>
					{title}
				</Animated.Text>
			</View>
			<View style={styles.rightSection}>
				{badge ? (
					<View style={[styles.badgeBox, { backgroundColor }]}>
						<Text style={styles.badgeText}>{badge}</Text>
					</View>
				) : (
					resolvedRight
				)}
			</View>
		</View>
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
			<View style={[styles.islandWrapper, headerSurface.shadowStyle]}>
				{isAndroid && (
					<View
						pointerEvents="none"
						style={[
							styles.islandShadowUnderlay,
							{ backgroundColor: headerSurface.underlayColor },
						]}
					/>
				)}
				<View
					style={[
						styles.islandClip,
						{
							backgroundColor: headerSurface.surfaceColor,
							...headerSurface.webBackdropStyle,
						},
					]}
				>
				{isIOS ? (
					<BlurView
						intensity={headerSurface.blurIntensity}
						tint={headerSurface.tint}
						style={[styles.blur, { minHeight: HEADER_HEIGHT }]}
					>
						{headerContent}
					</BlurView>
				) : (
					// Android: split-layer glass surface (shadow underlay + translucent island clip)
					<View style={[styles.blur, {
						minHeight: HEADER_HEIGHT,
						backgroundColor: "transparent"
					}]}>
						{headerContent}
					</View>
				)}
				</View>
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
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
		overflow: "visible",
		position: "relative",
	},
	islandClip: {
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
		overflow: "hidden",
	},
	islandShadowUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
	},
	blur: {
		borderRadius: SURFACE_RADII.HEADER_ISLAND,
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
		borderRadius: SURFACE_RADII.ACTION_CHIP,
		alignItems: "center",
		justifyContent: "center",
		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOpacity: 0.1,
				shadowRadius: 4,
				shadowOffset: { width: 0, height: 2 },
			},
			web: {
				boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
			},
			default: {},
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
