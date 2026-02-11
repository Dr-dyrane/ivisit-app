import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

export default function MedicalHistoryCard({
	medicalProfile,
	onPress,
	fadeAnim,
	slideAnim,
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3F4F6",
	};

	const medicalItems = [
		{ label: "Blood Type", value: medicalProfile?.bloodType, icon: "water-outline" },
		{ label: "Allergies", value: medicalProfile?.allergies, icon: "warning-outline" },
		{ label: "Current Medications", value: medicalProfile?.medications, icon: "medical-outline" },
		{ label: "Past Surgeries", value: medicalProfile?.surgeries, icon: "bandage-outline" },
		{ label: "Chronic Conditions", value: medicalProfile?.conditions, icon: "fitness-outline" },
		{ label: "Emergency Notes", value: medicalProfile?.notes, icon: "document-text-outline" },
	];

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ translateY: slideAnim }],
				paddingHorizontal: 12,
				marginTop: 32,
			}}
		>
			<Text
				style={{
					fontSize: 10,
					fontWeight: "800",
					color: colors.textMuted,
					marginBottom: 16,
					letterSpacing: 1.5,
					textTransform: "uppercase",
				}}
			>
				MEDICAL HISTORY
			</Text>

			<View
				style={{
					backgroundColor: colors.card,
					borderRadius: 36,
					padding: 24,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: isDarkMode ? 0 : 0.03,
					shadowRadius: 10,
				}}
			>
				<Text
					style={{
						fontSize: 14,
						color: colors.textMuted,
						marginBottom: 20,
						lineHeight: 20,
					}}
				>
					Your medical history is private and secure. Only authorized healthcare
					providers can access this information.
				</Text>

				{medicalItems.map((item, index) => (
					<View
						key={index}
						style={{
							flexDirection: "row",
							alignItems: "center",
							marginBottom: 14,
						}}
					>
						<View
							style={{
								width: 36,
								height: 36,
								borderRadius: 12,
								backgroundColor: `${COLORS.brandPrimary}15`,
								alignItems: "center",
								justifyContent: "center",
								marginRight: 12,
							}}
						>
							<Ionicons
								name={item.icon}
								size={18}
								color={COLORS.brandPrimary}
							/>
						</View>
						<View style={{ flex: 1 }}>
							<Text
								style={{
									color: colors.text,
									fontSize: 15,
									fontWeight: "800",
									letterSpacing: -0.5,
								}}
							>
								{item.label}
							</Text>
							<Text
								numberOfLines={1}
								style={{
									color: colors.textMuted,
									fontSize: 13,
									marginTop: 2,
								}}
							>
								{item.value || "None listed"}
							</Text>
						</View>
					</View>
				))}

				<Pressable
					style={{
						backgroundColor: COLORS.brandPrimary,
						borderRadius: 24,
						padding: 16,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						marginTop: 8,
					}}
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						onPress();
					}}
				>
					<Ionicons name="document-text" size={20} color="#FFFFFF" />
					<Text
						style={{
							marginLeft: 8,
							color: "#FFFFFF",
							fontWeight: "900",
							letterSpacing: -0.5,
						}}
					>
						Edit Medical History
					</Text>
				</Pressable>
			</View>
		</Animated.View>
	);
}
