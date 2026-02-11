import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

export default function SecuritySection({
	hasPassword,
	onPress,
	fadeAnim,
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3F4F6",
	};

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				paddingHorizontal: 12,
				marginTop: 32,
			}}
		>
			<Pressable
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					onPress();
				}}
				style={{
					backgroundColor: colors.card,
					borderRadius: 36,
					padding: 20,
					flexDirection: "row",
					alignItems: "center",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: isDarkMode ? 0 : 0.03,
					shadowRadius: 10,
					marginBottom: 14,
				}}
			>
				<View
					style={{
						backgroundColor: COLORS.brandPrimary,
						width: 56,
						height: 56,
						borderRadius: 14,
						alignItems: "center",
						justifyContent: "center",
						marginRight: 16,
					}}
				>
					<Ionicons name="lock-closed" size={26} color="#FFFFFF" />
				</View>
				<View style={{ flex: 1 }}>
					<Text
						style={{
							fontSize: 19,
							fontWeight: "900",
							color: colors.text,
							letterSpacing: -1.0,
						}}
					>
						{hasPassword ? "Change Password" : "Create Password"}
					</Text>
					<Text
						style={{
							fontSize: 14,
							color: colors.textMuted,
							marginTop: 2,
						}}
					>
						{hasPassword
							? "Update your password anytime"
							: "Add password login to your account"}
					</Text>
				</View>
				<View
					style={{
						width: 36,
						height: 36,
						borderRadius: 14,
						backgroundColor: isDarkMode
							? "rgba(255,255,255,0.025)"
							: "rgba(0,0,0,0.025)",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Ionicons
						name="chevron-forward"
						size={16}
						color={colors.textMuted}
					/>
				</View>
			</Pressable>
		</Animated.View>
	);
}
