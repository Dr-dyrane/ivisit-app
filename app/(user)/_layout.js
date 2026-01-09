// app/(user)/_layout.js

import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { UserProviders } from "../../providers/UserProviders";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import GlobalFAB from "../../components/navigation/GlobalFAB";
import { appMigrationsService } from "../../services/appMigrationsService";

export default function UserLayout() {
	useEffect(() => {
		appMigrationsService.run().catch(() => {});
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
