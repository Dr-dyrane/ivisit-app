// components/headers/ProfileAvatarButton.jsx
// Reusable profile avatar button with haptic feedback

import { Image, TouchableOpacity, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * ProfileAvatarButton - A modular profile avatar with haptic feedback
 * 
 * Features:
 * - Displays user profile image or fallback
 * - Haptic feedback on press (Medium impact)
 * - Navigates to profile screen on press
 * - Consistent styling with brand colors
 */
export default function ProfileAvatarButton() {
	const router = useRouter();
	const segments = useSegments();
	const { user } = useAuth();
	const { isDarkMode } = useTheme();

	const handlePress = () => {
		if (segments?.[0] === "(user)" && segments?.[1] === "(stacks)" && segments?.[2] === "more") {
			return;
		}
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		router.push("/(user)/(stacks)/more");
	};

	return (
		<TouchableOpacity
			onPress={handlePress}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<View>
				<Image
					source={
						user?.imageUri
							? { uri: user.imageUri }
							: require("../../assets/profile.jpg")
					}
					resizeMode="cover"
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						borderWidth: 2,
						borderColor: COLORS.brandPrimary,
					}}
				/>
				{user?.hasInsurance && (
				<View
					style={{
						position: "absolute",
						bottom: -2,
						right: -2,
						backgroundColor: COLORS.brandPrimary,
						borderRadius: 8,
						width: 14,
						height: 14,
						justifyContent: "center",
						alignItems: "center",
						borderWidth: 1.5,
						borderColor: isDarkMode ? COLORS.bgDark : "#FFFFFF",
					}}
				>
					<Ionicons name="shield-checkmark" size={8} color="#FFFFFF" />
				</View>
				)}
			</View>
		</TouchableOpacity>
	);
}

