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

// We wait 2000ms so the user sees the Logo, Hero, and CTA first.
const RENDER_DELAY_MS = 2000;
const AUTO_COLLAPSE_MS = 3000;
const PRIMARY_RED = "#86100E";

export default function ThemeToggle() {
	const { isDarkMode, toggleTheme } = useTheme();
	const pathname = usePathname();

	const [mounted, setMounted] = useState(false);
	const [expanded, setExpanded] = useState(false);

	const heightAnim = useRef(new Animated.Value(48)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(20)).current; // For a subtle slide-in
	const collapseTimer = useRef(null);
	const labelFadeAnim = useRef(new Animated.Value(1)).current; 

	const iconSize = 20;

	// Delay the initial mount
	useEffect(() => {
		const t = setTimeout(() => setMounted(true), RENDER_DELAY_MS);
		return () => clearTimeout(t);
	}, []);

	// Once mounted, fade and slide in softly
	useEffect(() => {
		if (!mounted) return;

		Animated.parallel([
			Animated.timing(opacityAnim, {
				toValue: 0.6, // Start at partial opacity to be even less distracting
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

	// Auto-collapse when user changes screens
	useEffect(() => {
		collapse();
	}, [pathname]);

	const expand = () => {
		clearTimer();
		setExpanded(true);

		// Bring to full opacity when interacted with
		opacityAnim.setValue(1);

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
			// Return to subtle opacity when idle
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

	if (!mounted) return null;

	const getBgColor = () => {
		if (Platform.OS === "android") {
			return isDarkMode
				? "rgba(15, 15, 15, 0.95)"
				: "rgba(255, 255, 255, 0.95)";
		}
		return isDarkMode ? "rgba(134, 16, 14, 0.05)" : "rgba(255, 255, 255, 0.05)";
	};

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
					<Pressable
						onPress={
							expanded ? (isDarkMode ? handleThemeChange : null) : expand
						}
						style={({ pressed }) => [
							styles.iconCircle,
							expanded && !isDarkMode && { backgroundColor: PRIMARY_RED },
							pressed && { opacity: 0.7 },
						]}
					>
						<Feather
							name="sun"
							size={iconSize}
							color={
								expanded
									? !isDarkMode
										? "white"
										: "rgba(255,255,255,0.3)"
									: isDarkMode
									? "white"
									: PRIMARY_RED
							}
						/>
					</Pressable>

					{expanded && (
						<Pressable
							onPress={isDarkMode ? null : handleThemeChange}
							style={[
								styles.iconCircle,
								isDarkMode && { backgroundColor: "white" },
							]}
						>
							<Feather
								name="moon"
								size={iconSize}
								color={isDarkMode ? PRIMARY_RED : "rgba(134, 16, 14, 0.3)"}
							/>
						</Pressable>
					)}
				</View>
			</Animated.View>

			{/* MORPHING LABEL */}
			<Animated.Text
				style={[
					styles.label,
					{
						color: isDarkMode ? "white" : "#333",
						opacity: labelFadeAnim.interpolate({
							inputRange: [0, 1],
							outputRange: [0, 0.5], // Max opacity 0.5 for subtle feel
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
