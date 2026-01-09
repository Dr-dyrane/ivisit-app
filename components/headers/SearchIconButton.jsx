import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export default function SearchIconButton() {
	const router = useRouter();
	const { isDarkMode } = useTheme();

	const iconColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

	return (
		<TouchableOpacity
			onPress={() => {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
				router.push("/(user)/(stacks)/search");
			}}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<Ionicons name="search-outline" size={24} color={iconColor} />
		</TouchableOpacity>
	);
}

