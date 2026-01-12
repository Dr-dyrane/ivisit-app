// components/navigation/HeaderBackButton.jsx
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export default function HeaderBackButton({ onPress }) {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const color = isDarkMode ? COLORS.bgLight : COLORS.brandPrimary;

	if (!router.canGoBack()) return null;

	const handlePress = () => {
		Haptics.selectionAsync();
		if (onPress) {
			onPress();
		} else {
			router.back();
		}
	};

	return (
		<Pressable
			onPress={handlePress}
			hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
		>
			<Ionicons name="chevron-back" size={24} color={color}/>
		</Pressable>
	);
}
