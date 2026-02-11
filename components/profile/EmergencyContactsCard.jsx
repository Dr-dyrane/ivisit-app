import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

export default function EmergencyContactsCard({
	contacts,
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

	const hasContacts = contacts && contacts.length > 0;

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
				EMERGENCY CONTACTS
			</Text>

			<Pressable
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
				}}
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					onPress();
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
					<Ionicons name="people" size={26} color="#FFFFFF" />
				</View>
				<View style={{ flex: 1 }}>
					<Text
						style={{
							fontSize: 19,
							fontWeight: "900",
							color: colors.text,
							letterSpacing: -1.0,
						}}
						numberOfLines={1}
					>
						{hasContacts ? contacts[0].name : "Add Contact"}
					</Text>
					<Text
						style={{
							fontSize: 14,
							color: colors.textMuted,
							marginTop: 2,
						}}
					>
						{hasContacts
							? contacts.length > 1
								? `and ${contacts.length - 1} more contact${
										contacts.length - 1 > 1 ? "s" : ""
								  }`
								: contacts[0].relationship
								? `${contacts[0].relationship} • Tap to add more`
								: "Tap to manage contacts"
							: "Family & emergency responders"}
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
						name={hasContacts ? "pencil" : "add"}
						size={20}
						color={colors.textMuted}
					/>
				</View>
			</Pressable>
		</Animated.View>
	);
}
