// app/(auth)/_layout.js

import { Stack, useSegments } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AuthProviders } from "../../providers/AuthProviders";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import WebAppShell from "../../components/web/WebAppShell";

function AuthStackScreens() {
	const segments = useSegments();
	const isWelcomeRoute =
		segments?.[0] === "(auth)" && (!segments?.[1] || segments?.[1] === "index");

	return (
		<WebAppShell variant="auth" surfaceMode={isWelcomeRoute ? "none" : "surface"}>
			<View style={styles.container}>
				<AuthHeaderWrapper />
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="index" options={{ headerShown: false }} />
					<Stack.Screen name="login" options={{ headerShown: false }} />
					<Stack.Screen name="onboarding" options={{ headerShown: false }} />
					<Stack.Screen name="signup" options={{ headerShown: false }} />
				</Stack>
			</View>
		</WebAppShell>
	);
}

function AuthHeaderWrapper() {
	const { headerState } = useHeaderState();

	const hasVisibleHeaderContent =
		Boolean(headerState.title) ||
		Boolean(headerState.subtitle) ||
		Boolean(headerState.icon) ||
		Boolean(headerState.badge) ||
		Boolean(headerState.leftComponent) ||
		Boolean(headerState.rightComponent);

	if (headerState.hidden || !hasVisibleHeaderContent) return null;

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
