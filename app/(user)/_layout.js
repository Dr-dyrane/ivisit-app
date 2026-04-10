// app/(user)/_layout.js

import { View, StyleSheet } from "react-native";
import { Stack, useSegments } from "expo-router";
import { useEffect } from "react";
import { UserProviders } from "../../providers/UserProviders";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import GlobalFAB from "../../components/navigation/GlobalFAB";
import { appMigrationsService } from "../../services/appMigrationsService";
import WebAppShell from "../../components/web/WebAppShell";
import { getHeaderBehavior } from "../../constants/header";

export default function UserLayout() {
	useEffect(() => {
		appMigrationsService.run().catch(() => { });
	}, []);

	return (
		<UserProviders>
			<WebAppShell variant="app">
				<View style={styles.container}>
					<UserHeaderWrapper />

					<Stack
						screenOptions={{
							headerShown: false,
							animation: "slide_from_right",
						}}
					>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen
							name="(stacks)"
							options={{
								presentation: "card",
							}}
						/>
					</Stack>

					<GlobalFAB />
				</View>
			</WebAppShell>
		</UserProviders>
	);
}

function UserHeaderWrapper() {
	const { headerState } = useHeaderState();
	const segments = useSegments();
	const { resetHeader } = useScrollAwareHeader();
	const resolvedHeader = getHeaderBehavior(headerState);

	// Disable scroll sensitivity for stack screens (detail views)
	const isStackScreen = segments.some((segment) => segment === "(stacks)");
	const scrollAware = !isStackScreen && resolvedHeader.isScrollAware;
	const hasVisibleHeaderContent =
		Boolean(resolvedHeader.title) ||
		Boolean(resolvedHeader.subtitle) ||
		Boolean(resolvedHeader.icon) ||
		Boolean(resolvedHeader.badge) ||
		Boolean(resolvedHeader.leftComponent) ||
		Boolean(resolvedHeader.rightComponent);

	// Reset header animation state when returning to tabs to ensure sensitivity is restored
	useEffect(() => {
		if (!isStackScreen) {
			resetHeader();
		}
	}, [isStackScreen, resetHeader]);

	if (resolvedHeader.isHidden || !hasVisibleHeaderContent) {
		return null;
	}

	return (
		<ScrollAwareHeader
			title={resolvedHeader.title}
			subtitle={resolvedHeader.subtitle}
			icon={resolvedHeader.icon}
			backgroundColor={resolvedHeader.backgroundColor}
			badge={resolvedHeader.badge}
			leftComponent={resolvedHeader.leftComponent}
			rightComponent={resolvedHeader.rightComponent}
			scrollAware={scrollAware}
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
