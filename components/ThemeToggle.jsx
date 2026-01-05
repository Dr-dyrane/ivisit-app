// components/ThemeToggle.jsx

"use client";

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

export default function ThemeToggle() {
	const { isDarkMode, toggleTheme } = useTheme();
	const pathname = usePathname();

	// Component states
	const [mounted, setMounted] = useState(false);
	const [expanded, setExpanded] = useState(false);

	// Animation refs
	const heightAnim = useRef(new Animated.Value(48)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(20)).current;
	const labelFadeAnim = useRef(new Animated.Value(1)).current;

	const collapseTimer = useRef(null);
	const iconSize = 20;

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
				toValue: 0.6,
				duration: 1000,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 1000,
				useNativeDriver: true,
			}),
		]).start();
	}, [mounted]);

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
			toValue: 110,
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
			toValue: 48,
			friction: 8,
			tension: 50,
			useNativeDriver: false,
		}).start(() => {
			Animated.timing(opacityAnim, {
				toValue: 0.6,
				duration: 500,
				useNativeDriver: true,
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

	// Skip rendering if not mounted yet
	if (!mounted) return null;

	// Platform-specific background
	const getBgColor = () => {
		if (Platform.OS === "android") {
			return isDarkMode
				? "rgba(15, 15, 15, 0.95)"
				: "rgba(255, 255, 255, 0.95)";
		}
		return isDarkMode ? "rgba(134, 16, 14, 0.05)" : "rgba(255, 255, 255, 0.05)";
	};

	// ------------------------
	// Render
	// ------------------------
	return (
		<Animated.View
			style={{
				position: "absolute",
				right: 16,
				top: Platform.OS === "ios" ? 54 : 34,
				opacity: opacityAnim,
				transform: [{ translateX: slideAnim }],
				zIndex: 99999,
				alignItems: "center",
			}}
		>
			<Animated.View
				style={{
					width: 48,
					height: heightAnim,
					borderRadius: 24,
					overflow: "hidden",
					backgroundColor: getBgColor(),
					borderWidth: 1,
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
						android: { elevation: 4 },
					}),
				}}
			>
				<BlurView
					intensity={Platform.OS === "ios" ? 30 : 10}
					tint={isDarkMode ? "dark" : "light"}
					style={StyleSheet.absoluteFill}
				/>

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
							expanded && !isDarkMode && { backgroundColor: COLORS.brandPrimary },
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
								isDarkMode && { backgroundColor: COLORS.bgLight },
							]}
						>
							<Feather
								name="moon"
								size={iconSize}
								color={isDarkMode ? COLORS.brandPrimary : "rgba(134, 16, 14, 0.3)"}
							/>
						</Pressable>
					)}
				</View>
			</Animated.View>

			{/* Morphing label */}
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
		</Animated.View>
	);
}

const styles = StyleSheet.create({
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
