;

import { Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";

export default function UserLayout() {
	const { user } = useAuth();
	const { isDarkMode } = useTheme();

	const backgroundColor = isDarkMode ? COLORS.bgDark : COLORS.bgLight;
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;

	return (
		<Stack
			screenOptions={{
				headerStyle: {
					backgroundColor: backgroundColor,
				},
				headerTintColor: textColor,
				headerShadowVisible: false,
				headerLeft: () => <HeaderBackButton />,
			}}
		>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />

			<Stack.Screen
				name="profile"
				options={{
					presentation: "card",
					headerShown: true,
					headerTitle: "My Profile",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: textColor,
					},
				}}
			/>
		</Stack>
	);
}
