// app/(auth)/_layout.js

import { Stack, useSegments } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useEffect } from "react";
import { AuthProviders } from "../../providers/AuthProviders";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFABActions } from "../../contexts/FABContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import WebAppShell from "../../components/web/WebAppShell";
import GlobalFAB from "../../components/navigation/GlobalFAB";
import { getHeaderBehavior } from "../../constants/header";

function AuthStackScreens() {
	const segments = useSegments();
	const authLeaf = segments?.[1] || "index";
	const isRequestHelpRoute = segments?.[0] === "(auth)" && authLeaf === "request-help";
	const isMapRoute = segments?.[0] === "(auth)" && authLeaf === "map";
	const isFullCanvasAuthRoute =
		segments?.[0] === "(auth)" &&
		(authLeaf === "index" || authLeaf === "request-help" || authLeaf === "map");
	const { enterStack, exitStack } = useFABActions();

	useEffect(() => {
		if (!isRequestHelpRoute && !isMapRoute) return undefined;
		enterStack();
		return () => exitStack();
	}, [enterStack, exitStack, isMapRoute, isRequestHelpRoute]);

	return (
		<WebAppShell
			variant="auth"
			surfaceMode={isFullCanvasAuthRoute ? "none" : "surface"}
		>
			<View style={styles.container}>
				<AuthHeaderWrapper />
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="index" options={{ headerShown: false }} />
					<Stack.Screen name="map" options={{ headerShown: false }} />
					<Stack.Screen name="request-help" options={{ headerShown: false }} />
					<Stack.Screen name="login" options={{ headerShown: false }} />
					<Stack.Screen name="onboarding" options={{ headerShown: false }} />
					<Stack.Screen name="signup" options={{ headerShown: false }} />
				</Stack>
			{isRequestHelpRoute || isMapRoute ? <GlobalFAB /> : null}
		</View>
		</WebAppShell>
	);
}

function AuthHeaderWrapper() {
	const { headerState } = useHeaderState();
	const resolvedHeader = getHeaderBehavior(headerState);

	const hasVisibleHeaderContent =
		Boolean(resolvedHeader.title) ||
		Boolean(resolvedHeader.subtitle) ||
		Boolean(resolvedHeader.icon) ||
		Boolean(resolvedHeader.badge) ||
		Boolean(resolvedHeader.leftComponent) ||
		Boolean(resolvedHeader.rightComponent);

	if (resolvedHeader.isHidden || !hasVisibleHeaderContent) return null;

	return (
		<ScrollAwareHeader
			title={resolvedHeader.title}
			subtitle={resolvedHeader.subtitle}
			icon={resolvedHeader.icon}
			backgroundColor={resolvedHeader.backgroundColor}
			badge={resolvedHeader.badge}
			leftComponent={resolvedHeader.leftComponent}
			rightComponent={resolvedHeader.rightComponent}
			scrollAware={resolvedHeader.isScrollAware}
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
