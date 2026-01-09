import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { TabBarVisibilityProvider } from "../../contexts/TabBarVisibilityContext";
import { HeaderStateProvider, useHeaderState } from "../../contexts/HeaderStateContext";
import { FABProvider } from "../../contexts/FABContext";
import { VisitsProvider } from "../../contexts/VisitsContext";
import { NotificationsProvider } from "../../contexts/NotificationsContext";
import { EmergencyUIProvider } from "../../contexts/EmergencyUIContext";
import { SearchProvider } from "../../contexts/SearchContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import GlobalFAB from "../../components/navigation/GlobalFAB";
import { appMigrationsService } from "../../services/appMigrationsService";

export default function UserLayout() {
	useEffect(() => {
		appMigrationsService.run().catch(() => {});
	}, []);

	return (
		<TabBarVisibilityProvider>
			<HeaderStateProvider>
				<FABProvider>
					<VisitsProvider>
						<NotificationsProvider>
							<SearchProvider>
								<EmergencyUIProvider>
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
								</EmergencyUIProvider>
							</SearchProvider>
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
