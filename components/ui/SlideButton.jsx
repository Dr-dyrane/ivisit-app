// components/ui/SlideButton.jsx

"use client";

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

export default function SlideButton({
	children,
	onPress,
	icon,
	height = 68,
	radius = 24,
}) {
	const { isDarkMode } = useTheme();

	const fillAnim = useRef(new Animated.Value(0)).current;
	const [width, setWidth] = useState(0);

	const PRIMARY = "#86100E";
	const BASE_BG = isDarkMode ? "#161B22" : "#F3E7E7";
	const BASE_TEXT = isDarkMode ? "#FFFFFF" : PRIMARY;
	const ACTIVE_TEXT = "#FFFFFF";

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

	const fillWidth = fillAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["5%", "100%"],
	});

	return (
		<Pressable
			onPress={handlePress}
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
			style={[
				styles.container,
				{
					height,
					borderRadius: radius,
					backgroundColor: BASE_BG,
				},
			]}
		>
			{/* BASE CONTENT */}
			<View style={styles.content}>
				<Text style={[styles.text, { color: BASE_TEXT }]}>{children}</Text>
				{icon && icon(BASE_TEXT)}
			</View>

			{/* SLIDING OVERLAY */}
			<Animated.View
				style={[
					styles.overlay,
					{
						width: fillWidth,
						backgroundColor: PRIMARY,
					},
				]}
			>
				<View style={[styles.content, { width }]}>
					<Text style={[styles.text, { color: ACTIVE_TEXT }]}>{children}</Text>
					{icon && icon(ACTIVE_TEXT)}
				</View>
			</Animated.View>
		</Pressable>
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
	},
	text: {
		fontSize: 17,
		fontWeight: "900",
		letterSpacing: 2,
		marginRight: 12,
	},
	overlay: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
	},
});
