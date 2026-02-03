// components/ui/SlideButton.jsx

import { useRef, useState } from "react";
import {
	View,
	Text,
	Pressable,
	Animated,
	Easing,
	StyleSheet,
	Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

/**
 * SlideButton
 *
 * File Path: components/ui/SlideButton.jsx
 *
 * A fully animated, sliding CTA button that visually responds to user presses.
 * Designed for primary actions like "Find Care Now".
 *
 * Props:
 * @param {React.ReactNode} children - The button label
 * @param {function} onPress - Callback invoked when the button is pressed
 * @param {function} icon - Optional function returning a React Node icon, receives current text color
 * @param {number} height - Button height (default 68)
 * @param {number} radius - Border radius (default 24)
 */
export default function SlideButton({
	children,
	onPress,
	icon,
	height = 68,
	radius = 24,
}) {
	const { isDarkMode } = useTheme();

	const fillAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const [width, setWidth] = useState(0);

	const themeColors = {
		primary: COLORS.brandPrimary,
		baseBG: isDarkMode ? COLORS.bgDark : "#F3E7E7",
		baseText: isDarkMode ? COLORS.bgLight : COLORS.brandPrimary,
		activeText: COLORS.bgLight,
	};

	const handlePress = () => {
		if (Platform.OS !== "web") {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		}

		Animated.timing(fillAnim, {
			toValue: 1,
			duration: 450,
			easing: Easing.bezier(0.16, 1, 0.3, 1),
			useNativeDriver: false,
		}).start(() => {
			onPress?.();
			setTimeout(() => fillAnim.setValue(0), 400);
		});
	};

	const handlePressIn = () => {
		Animated.spring(scaleAnim, {
			toValue: 0.98,
			useNativeDriver: true,
		}).start();
		if (Platform.OS !== "web") Haptics.selectionAsync();
	};

	const handlePressOut = () => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 5,
			useNativeDriver: true,
		}).start();
	};

	const fillWidth = fillAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["5%", "100%"],
	});

	const overlayTextOpacity = fillAnim.interpolate({
		inputRange: [0, 0.15, 1],
		outputRange: [0, 1, 1],
		extrapolate: "clamp",
	});

	return (
		<Animated.View style={{ transform: [{ scale: scaleAnim }], width: "100%" }}>
			<Pressable
				onPress={handlePress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
				style={[
					styles.container,
					{
						height,
						borderRadius: radius,
						backgroundColor: themeColors.baseBG,
					},
				]}
			>
				{/* Base content */}
				<View style={styles.content}>
					<Text
						style={[styles.text, { color: themeColors.baseText }]}
						// [ACCESSIBILITY-FIX] Prevent text overflow on large font devices
						numberOfLines={1}
						adjustsFontSizeToFit
						minimumFontScale={0.7}
					>
						{children}
					</Text>
					{icon && icon(themeColors.baseText)}
				</View>

				{/* Sliding overlay */}
				<Animated.View
					style={[
						styles.overlay,
						{
							width: fillWidth,
							backgroundColor: themeColors.primary,
						},
					]}
				>
					<Animated.View
						style={[styles.content, { width, opacity: overlayTextOpacity }]}
					>
						<Text
							style={[styles.text, { color: themeColors.activeText }]}
							// [ACCESSIBILITY-FIX] Prevent text overflow on large font devices
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.7}
						>
							{children}
						</Text>
						{icon && icon(themeColors.activeText)}
					</Animated.View>
				</Animated.View>
			</Pressable>
		</Animated.View >
	);
}

const styles = StyleSheet.create({
	container: {
		width: "100%",
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		height: "100%",
		paddingHorizontal: 16, // Ensure content has padding
	},
	text: {
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: 2,
		marginRight: 12,
		flexShrink: 1, // Allow text to shrink if needed
	},
	overlay: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
	},
});
