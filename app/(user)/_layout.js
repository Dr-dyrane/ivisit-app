import { Stack } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export default function UserLayout() {
	const { isDarkMode } = useTheme();

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "slide_from_right",
			}}
		>
			{/* Bottom tabs (persistent) */}
			<Stack.Screen name="(tabs)" />

			{/* Secondary flows on top of tabs */}
			<Stack.Screen
				name="(stacks)"
				options={{
					presentation: "card",
				}}
			/>
		</Stack>
	);
}
