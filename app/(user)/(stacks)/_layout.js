// app/(user)/(stacks)/_layout.js
import { useEffect, useMemo } from "react";
import { Stack, useSegments } from "expo-router";
import { useTheme } from "../../../contexts/ThemeContext";
import { useFABActions } from "../../../contexts/FABContext";
import { useHeaderState } from "../../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../../contexts/ScrollAwareHeaderContext";
import { COLORS } from "../../../constants/colors";
import { STACK_TOP_PADDING } from "../../../constants/layout";
import HeaderBackButton from "../../../components/navigation/HeaderBackButton";

export default function StacksLayout() {
	const { isDarkMode } = useTheme();
	const segments = useSegments();
	// Use stable actions hook to prevent re-render loops on FAB registration
	const { enterStack, exitStack } = useFABActions();
	const { setHeaderState } = useHeaderState();
	const { unlockHeaderHidden, forceHeaderVisible } = useScrollAwareHeader();

	const isEmergencyRequestRoute = useMemo(() => {
		const hasEmergencySegment = segments.includes("emergency");
		const isRequestAmbulance = segments.includes("request-ambulance");
		const isBookBed = segments.includes("book-bed");
		return hasEmergencySegment && (isRequestAmbulance || isBookBed);
	}, [segments]);

	// Hide FAB when entering stack screens
	useEffect(() => {
		enterStack();
		return () => exitStack();
	}, [enterStack, exitStack]);

	useEffect(() => {
		if (!isEmergencyRequestRoute) return;
		unlockHeaderHidden();
		forceHeaderVisible();
		setHeaderState({
			hidden: false,
			scrollAware: false,
		});
	}, [isEmergencyRequestRoute, unlockHeaderHidden, forceHeaderVisible, setHeaderState]);

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerBackTitleVisible: false,
				headerShadowVisible: false,
				headerStyle: {
					backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
				},
				headerTintColor: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
				contentStyle: {
					backgroundColor: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
					borderTopWidth: 0,
					paddingTop: STACK_TOP_PADDING,
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

			<Stack.Screen
				name="more"
				options={{
					headerTitle: "More",
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
				name="notification-details"
				options={{
					headerTitle: "Notification Details",
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
				name="payment"
				options={{
					headerTitle: "Payment",
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
