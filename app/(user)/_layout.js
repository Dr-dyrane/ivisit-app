import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { TabBarVisibilityProvider } from "../../contexts/TabBarVisibilityContext";
import { HeaderStateProvider, useHeaderState } from "../../contexts/HeaderStateContext";
import { FABProvider } from "../../contexts/FABContext";
import { VisitsProvider } from "../../contexts/VisitsContext";
import { NotificationsProvider } from "../../contexts/NotificationsContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import GlobalFAB from "../../components/navigation/GlobalFAB";

export default function UserLayout() {
	return (
		<TabBarVisibilityProvider>
			<HeaderStateProvider>
				<FABProvider>
					<VisitsProvider>
						<NotificationsProvider>
							<View style={styles.container}>
								{/* Fixed header at layout level */}
								<UserHeaderWrapper />

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

								{/* Global FAB - always above tabs */}
								<GlobalFAB />
							</View>
						</NotificationsProvider>
					</VisitsProvider>
				</FABProvider>
			</HeaderStateProvider>
		</TabBarVisibilityProvider>
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
