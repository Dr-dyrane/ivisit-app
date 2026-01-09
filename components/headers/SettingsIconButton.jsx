import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { ROUTES, navigateToSettings } from "../../utils/navigationHelpers";

export default function SettingsIconButton() {
	const router = useRouter();
	const pathname = usePathname();
	const { isDarkMode } = useTheme();

	const iconColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;

	return (
		<TouchableOpacity
			onPress={() => {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
				if (typeof pathname === "string" && pathname.startsWith(ROUTES.STACK_SETTINGS)) return;
				navigateToSettings({ router });
			}}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<Ionicons name="settings-outline" size={24} color={iconColor} />
		</TouchableOpacity>
	);
}
