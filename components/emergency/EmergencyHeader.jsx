import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export default function EmergencyHeader() {
	const { isDarkMode } = useTheme();
	const pulseAnim = useRef(new Animated.Value(1)).current;

	const colors = {
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		textMuted: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
	};

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.2,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		).start();
	}, []);

	return (
		<View style={{ flexDirection: "row", alignItems: "center" }}>
			<View
				style={{
					backgroundColor: `${COLORS.brandPrimary}15`,
					padding: 12,
					borderRadius: 16,
					marginRight: 16,
				}}
			>
				<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
					<Ionicons name="alert-circle" size={28} color={COLORS.brandPrimary} />
				</Animated.View>
			</View>
			<View style={{ flex: 1 }}>
				<Text
					style={{
						fontSize: 22,
						fontWeight: "700",
						color: colors.text,
						letterSpacing: -0.5,
						marginBottom: 4,
					}}
				>
					Emergency Response
				</Text>
				<Text style={{ fontSize: 14, color: colors.textMuted }}>
					Select service type
				</Text>
			</View>
		</View>
	);
}
