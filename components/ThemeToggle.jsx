// components/ThemeToggle.jsx

import { useEffect, useRef, useState } from "react";
import {
	View,
	Pressable,
	Animated,
	Platform,
	StyleSheet,
	Text,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import { usePathname } from "expo-router";

/**
 * ThemeToggle
 *
 * File Path: components/ThemeToggle.jsx
 *
 * A floating theme toggle button that:
 * - Shows subtle initial animation
 * - Expands on press to reveal Dark/Light options
 * - Collapses automatically or on navigation
 * - Provides haptic feedback
 *
 * The component uses Animated API, BlurView, and Feather icons.
 * Works across iOS and Android with platform-specific styling.
 */

const RENDER_DELAY_MS = 2000; // Delay initial mount for Hero/CTA to be seen
const AUTO_COLLAPSE_MS = 3000; // Auto-collapse delay
import { COLORS } from "../constants/colors";

export default function ThemeToggle({ showLabel = true }) {
	const { isDarkMode, toggleTheme } = useTheme();
	const pathname = usePathname();
	const isAndroid = Platform.OS === "android";
	const isWeb = Platform.OS === "web";
	const isWelcomeRoute = pathname === "/";
	const shellSize = isWelcomeRoute ? 44 : 48;
	const expandedHeight = isWelcomeRoute ? 100 : 110;
	const targetOpacity = isWelcomeRoute ? 0.46 : 0.6;
	const iconSize = isWelcomeRoute ? 18 : 20;
	const iconCircleSize = isWelcomeRoute ? 32 : 36;

	// Component states
	const [mounted, setMounted] = useState(false);
	const [expanded, setExpanded] = useState(false);

	// Animation refs
	const heightAnim = useRef(new Animated.Value(shellSize)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(20)).current;
	const labelFadeAnim = useRef(new Animated.Value(1)).current;

	const collapseTimer = useRef(null);
	// ------------------------
	// Lifecycle Effects
	// ------------------------

	// Initial mount delay
	useEffect(() => {
		const t = setTimeout(() => setMounted(true), RENDER_DELAY_MS);
		return () => clearTimeout(t);
	}, []);

	// Fade & slide in after mount
	useEffect(() => {
		if (!mounted) return;

		Animated.parallel([
			Animated.timing(opacityAnim, {
				toValue: targetOpacity,
				duration: 1000,
				useNativeDriver: Platform.OS !== 'web',
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 1000,
				useNativeDriver: Platform.OS !== 'web',
			}),
		]).start();
	}, [mounted, targetOpacity]);

	useEffect(() => {
		heightAnim.setValue(expanded ? expandedHeight : shellSize);
	}, [expanded, expandedHeight, shellSize, heightAnim]);

	// Collapse on navigation
	useEffect(() => {
		collapse();
	}, [pathname]);

	// ------------------------
	// Animation Helpers
	// ------------------------
	const expand = () => {
		clearTimer();
		setExpanded(true);
		opacityAnim.setValue(1); // full visibility
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

		Animated.spring(heightAnim, {
			toValue: expandedHeight,
			friction: 8,
			tension: 50,
			useNativeDriver: false,
		}).start();

		collapseTimer.current = setTimeout(collapse, AUTO_COLLAPSE_MS);
	};

	const collapse = () => {
		clearTimer();
		setExpanded(false);

		Animated.spring(heightAnim, {
			toValue: shellSize,
			friction: 8,
			tension: 50,
			useNativeDriver: false,
		}).start(() => {
			Animated.timing(opacityAnim, {
				toValue: targetOpacity,
				duration: 500,
				useNativeDriver: Platform.OS !== 'web',
			}).start();
		});
	};

	const clearTimer = () => {
		if (collapseTimer.current) {
			clearTimeout(collapseTimer.current);
			collapseTimer.current = null;
		}
	};

	const handleThemeChange = () => {
		toggleTheme();
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		collapse();
	};

	// Skip rendering until delayed mount is complete
	if (!mounted) return null;

	// Android split-layer glass surfaces
	const androidGlassSurface = isDarkMode
		? "rgba(18, 24, 38, 0.74)"
		: "rgba(255, 255, 255, 0.80)";
	const androidShadowLayer = isDarkMode
		? "rgba(0, 0, 0, 0.24)"
		: "rgba(15, 23, 42, 0.12)";

	// ------------------------
	// Render
	// ------------------------
	return (
		<Animated.View
			style={{
				position: "absolute",
				right: 16,
				top: Platform.OS === "ios" ? (isWelcomeRoute ? 50 : 54) : isWeb ? 18 : 34,
				opacity: opacityAnim,
				transform: [{ translateX: slideAnim }],
				zIndex: 99999,
				alignItems: "center",
			}}
		>
			<Animated.View
				style={{
					width: shellSize,
					height: heightAnim,
					borderRadius: shellSize / 2,
					overflow: "visible",
					backgroundColor: "transparent",
					borderWidth: isAndroid ? 0 : 1,
					borderColor: isDarkMode
						? "rgba(255,255,255,0.1)"
						: "rgba(134, 16, 14, 0.2)",
					...Platform.select({
						ios: {
							shadowColor: "#000",
							shadowOpacity: 0.1,
							shadowRadius: 10,
							shadowOffset: { width: 0, height: 4 },
						},
						android: { elevation: 0 },
					}),
				}}
			>
				{isAndroid && (
					<View
						style={[
							styles.androidShadowLayer,
							{ backgroundColor: androidShadowLayer },
						]}
					/>
				)}

				<View
					style={[
						styles.toggleClip,
						{
							height: "100%",
							borderRadius: shellSize / 2,
							backgroundColor: isAndroid
								? androidGlassSurface
								: (isDarkMode ? "rgba(134, 16, 14, 0.05)" : "rgba(255, 255, 255, 0.05)"),
						},
					]}
				>
					{Platform.OS === "ios" ? (
						<BlurView
							intensity={30}
							tint={isDarkMode ? "dark" : "light"}
							style={StyleSheet.absoluteFill}
						/>
					) : null}

					<View
						style={{
							flex: 1,
							alignItems: "center",
							justifyContent: "space-around",
							paddingVertical: 4,
						}}
					>
						{/* Sun Icon */}
						<Pressable
							onPress={
								expanded ? (isDarkMode ? handleThemeChange : null) : expand
							}
							style={({ pressed }) => [
								styles.iconCircle,
								{ width: iconCircleSize, height: iconCircleSize, borderRadius: iconCircleSize / 2 },
								expanded &&
								!isDarkMode && { backgroundColor: COLORS.brandPrimary },
								pressed && { opacity: 0.7 },
							]}
						>
							<Feather
								name="sun"
								size={iconSize}
								color={
									expanded
										? !isDarkMode
											? COLORS.bgLight
											: "rgba(255,255,255,0.3)"
										: isDarkMode
											? COLORS.bgLight
											: COLORS.brandPrimary
								}
							/>
						</Pressable>

						{/* Moon Icon (Expanded Only) */}
						{expanded && (
							<Pressable
								onPress={isDarkMode ? null : handleThemeChange}
							style={[
								styles.iconCircle,
								{ width: iconCircleSize, height: iconCircleSize, borderRadius: iconCircleSize / 2 },
								isDarkMode && { backgroundColor: COLORS.bgLight },
							]}
						>
								<Feather
									name="moon"
									size={iconSize}
									color={
										isDarkMode ? COLORS.brandPrimary : "rgba(134, 16, 14, 0.3)"
									}
								/>
							</Pressable>
						)}
					</View>
				</View>
			</Animated.View>

			{/* Morphing label */}
			{showLabel ? (
				<Animated.Text
					style={[
						styles.label,
						{
							color: isDarkMode ? "white" : "#333",
							opacity: labelFadeAnim.interpolate({
								inputRange: [0, 1],
								outputRange: [0, 0.5],
							}),
						},
					]}
				>
					{expanded ? "THEME" : isDarkMode ? "DARK" : "LIGHT"}
				</Animated.Text>
			) : null}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	toggleClip: {
		overflow: "hidden",
	},
	androidShadowLayer: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 24,
	},
	iconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		marginTop: 6,
		fontSize: 8,
		fontWeight: "900",
		letterSpacing: 1.5,
		opacity: 0.4,
	},
});
