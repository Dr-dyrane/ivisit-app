import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import ActionWrapper from "./ActionWrapper";

export default function HeaderLocationButton({ onPress }) {
	const { isDarkMode } = useTheme();

	return (
		<ActionWrapper style={{ borderRadius: 999 }}>
			<TouchableOpacity
				onPress={() => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					onPress?.();
				}}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				style={{
					width: 42,
					height: 42,
					borderRadius: 999,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Ionicons
					name="location-outline"
					size={22}
					color={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
				/>
			</TouchableOpacity>
		</ActionWrapper>
	);
}
