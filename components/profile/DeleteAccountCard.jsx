import { View, Text, Pressable, Animated, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

export default function DeleteAccountCard({
	onDelete,
	isDeleting,
	fadeAnim,
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
	};

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				paddingHorizontal: 12,
				marginTop: 32,
				marginBottom: 100,
			}}
		>
			<Text
				style={{
					fontSize: 10,
					fontWeight: "800",
					color: COLORS.error,
					marginBottom: 16,
					letterSpacing: 1.5,
					textTransform: "uppercase",
				}}
			>
				DANGER ZONE
			</Text>

			<Pressable
				onPress={onDelete}
				disabled={isDeleting}
				style={{
					backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
					borderRadius: 36,
					padding: 20,
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<View
					style={{
						backgroundColor: COLORS.error,
						width: 56,
						height: 56,
						borderRadius: 14,
						alignItems: "center",
						justifyContent: "center",
						marginRight: 16,
					}}
				>
					{isDeleting ? (
						<ActivityIndicator color="#FFFFFF" />
					) : (
						<Ionicons name="trash-outline" size={26} color="#FFFFFF" />
					)}
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
						Delete Account
					</Text>
					<Text
						style={{
							fontSize: 14,
							color: colors.textMuted,
							marginTop: 2,
						}}
					>
						Permanently remove your data
					</Text>
				</View>
			</Pressable>
		</Animated.View>
	);
}
