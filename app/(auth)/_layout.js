// app/(auth)/_layout.js

import { Stack } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { commonScreenOptions } from "../../utils/navigationOptions";
import { useTheme } from "../../contexts/ThemeContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { AuthProviders } from "../../providers/AuthProviders";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";

function AuthStackScreens() {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { previousStep, canGoBack: canGoBackInFlow } = useRegistration();

	const handleBackPress = () => {
		if (canGoBackInFlow) {
			console.log("[v0] Back pressed - using registration flow");
			previousStep();
		} else {
			console.log("[v0] Back pressed - using router");
			router.back();
		}
	};

	return (
		<View style={styles.container}>
			<AuthHeaderWrapper />
			<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{ headerShown: false }}
			/>

			<Stack.Screen
				name="login"
				options={{ headerShown: false }}
			/>

			<Stack.Screen
				name="onboarding"
				options={{ headerShown: false }}
			/>

			<Stack.Screen
				name="signup"
				options={{ headerShown: false }}
			/>
		</Stack>
		</View>
	);
}

function AuthHeaderWrapper() {
	const { headerState } = useHeaderState();

	if (headerState.hidden) return null;

	return (
		<ScrollAwareHeader
			title={headerState.title}
			subtitle={headerState.subtitle}
			icon={headerState.icon}
			backgroundColor={headerState.backgroundColor}
			badge={headerState.badge}
			leftComponent={headerState.leftComponent}
			rightComponent={headerState.rightComponent}
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});

export default function AuthLayout() {
	return (
		<AuthProviders>
			<AuthStackScreens />
		</AuthProviders>
	);
}
