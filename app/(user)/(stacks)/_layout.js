// app/(user)/(stacks)/_layout.js
import { Stack } from "expo-router";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import HeaderBackButton from "../../../components/navigation/HeaderBackButton";

export default function StacksLayout() {
	const { isDarkMode } = useTheme();

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerBackTitleVisible: false,
				headerStyle: {
					backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
				},
				headerTintColor: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
			}}
		>
			{/* Profile screen */}
			<Stack.Screen
				name="profile"
				options={{
					headerTitle: "My Profile",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>
		</Stack>
	);
}
