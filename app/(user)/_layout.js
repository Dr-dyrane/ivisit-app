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

export default function UserLayout() {
	useEffect(() => {
		appMigrationsService.run().catch(() => { });
	}, []);

	return (
		<UserProviders>
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
		</UserProviders>
	);
}

function UserHeaderWrapper() {
	const { headerState } = useHeaderState();
	const segments = useSegments();
	const { resetHeader } = useScrollAwareHeader();

	// Disable scroll sensitivity for stack screens (detail views)
	const isStackScreen = segments.some(s => s === '(stacks)');
	const scrollAware = !isStackScreen && headerState.scrollAware;

	// Reset header state when returning to tabs to ensure sensitivity is restored
	useEffect(() => {
		if (!isStackScreen) {
			resetHeader();
		}
	}, [isStackScreen]);

	return (
		<ScrollAwareHeader
			title={headerState.title}
			subtitle={headerState.subtitle}
			icon={headerState.icon}
			backgroundColor={headerState.backgroundColor}
			badge={headerState.badge}
			leftComponent={headerState.leftComponent}
			rightComponent={headerState.rightComponent}
			scrollAware={scrollAware}
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
