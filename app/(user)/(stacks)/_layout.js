// app/(user)/(stacks)/_layout.js
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useTheme } from "../../../contexts/ThemeContext";
import { useFAB } from "../../../contexts/FABContext";
import { COLORS } from "../../../constants/colors";
import HeaderBackButton from "../../../components/navigation/HeaderBackButton";

export default function StacksLayout() {
	const { isDarkMode } = useTheme();
	const { enterStack, exitStack } = useFAB();

	// Hide FAB when entering stack screens
	useEffect(() => {
		enterStack();
		return () => exitStack();
	}, [enterStack, exitStack]);

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerBackTitleVisible: false,
				headerShadowVisible: false,
				headerStyle: {
					backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
				},
				headerTintColor: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
				contentStyle: {
					backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
					borderTopWidth: 0,
				},
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

			{/* Notifications screen */}
			<Stack.Screen
				name="notifications"
				options={{
					headerTitle: "Notifications",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="medical-profile"
				options={{
					headerTitle: "Medical Profile",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="emergency-contacts"
				options={{
					headerTitle: "Emergency Contacts",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="insurance"
				options={{
					headerTitle: "Insurance",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="settings"
				options={{
					headerTitle: "Settings",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="help-support"
				options={{
					headerTitle: "Help & Support",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="visit/[id]"
				options={{
					headerTitle: "Visit Details",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="book-visit"
				options={{
					headerTitle: "Book a Visit",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="emergency/request-ambulance"
				options={{
					headerTitle: "Request Ambulance",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="emergency/book-bed"
				options={{
					headerTitle: "Book Bed",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="create-password"
				options={{
					headerTitle: "Create Password",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="change-password"
				options={{
					headerTitle: "Change Password",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => <HeaderBackButton />,
				}}
			/>

			<Stack.Screen
				name="complete-profile"
				options={{
					headerTitle: "Complete Profile",
					headerTitleStyle: {
						fontWeight: "bold",
						fontSize: 18,
						color: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
					},
					headerLeft: () => null,
					gestureEnabled: false,
				}}
			/>
		</Stack>
	);
}
