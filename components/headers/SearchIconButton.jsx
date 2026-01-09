import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { ROUTES } from "../../utils/navigationHelpers";

export default function SearchIconButton() {
	const router = useRouter();
	const pathname = usePathname();
	const { isDarkMode } = useTheme();

	const iconColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

	return (
		<TouchableOpacity
			onPress={() => {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
				if (pathname === ROUTES.STACK_SEARCH) return;
				router.push(ROUTES.STACK_SEARCH);
			}}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<Ionicons name="search-outline" size={24} color={iconColor} />
		</TouchableOpacity>
	);
}
