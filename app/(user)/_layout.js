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
	const segments = useSegments();
	const isTabsIndex = segments?.[0] === "(user)" && segments?.[1] === "(tabs)" && segments?.[2] === "index";
	const isStackRoute = segments?.[0] === "(user)" && segments?.[1] === "(stacks)";

	useEffect(() => {
		appMigrationsService.run().catch(() => { });
	}, []);

	return (
		<UserProviders>
			<WebAppShell
				variant="app"
				surfaceMode={isTabsIndex || isStackRoute ? "none" : "surface"}
			>
				<View style={styles.container}>
					<UserHeaderWrapper />

					<Stack
						screenOptions={{
							headerShown: false,
							animation: "slide_from_right",
						}}
					>
						<Stack.Screen name="index" />
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

	// Reset header animation state when returning to tabs to ensure sensitivity is restored
	useEffect(() => {
		if (!isStackScreen) {
			resetHeader();
		}
	}, [isStackScreen, resetHeader]);

	if (resolvedHeader.isHidden || !resolvedHeader.hasRenderableContent) {
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
			mode={resolvedHeader.mode}
			session={resolvedHeader.session}
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
