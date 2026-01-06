import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { TabBarVisibilityProvider } from "../../contexts/TabBarVisibilityContext";
import { FABProvider } from "../../contexts/FABContext";
import { VisitsProvider } from "../../contexts/VisitsContext";
import { NotificationsProvider } from "../../contexts/NotificationsContext";
import GlobalFAB from "../../components/navigation/GlobalFAB";

export default function UserLayout() {
	return (
		<TabBarVisibilityProvider>
			<FABProvider>
				<VisitsProvider>
					<NotificationsProvider>
						<View style={styles.container}>
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
		</TabBarVisibilityProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
