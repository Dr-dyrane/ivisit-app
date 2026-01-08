// components/headers/ProfileAvatarButton.jsx
// Reusable profile avatar button with haptic feedback

import { Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../contexts/AuthContext";
import { COLORS } from "../../constants/colors";

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
	const { user } = useAuth();

	const handlePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		router.push("/(user)/(stacks)/profile");
	};

	return (
		<TouchableOpacity
			onPress={handlePress}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
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
		</TouchableOpacity>
	);
}

