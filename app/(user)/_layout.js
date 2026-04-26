// app/(user)/_layout.js
// PULLBACK NOTE: Pass 3 - Added auth guards to enforce authentication + profile completion
// OLD: No auth guards, relied on RootNavigator runtime redirects
// NEW: Route group layout owns auth enforcement (unauthenticated → /(auth), incomplete → /complete-profile)

import { View, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { UserProviders } from "../../providers/UserProviders";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import ScrollAwareHeader from "../../components/headers/ScrollAwareHeader";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import GlobalFAB from "../../components/navigation/GlobalFAB";
import { appMigrationsService } from "../../services/appMigrationsService";
import { getHeaderBehavior } from "../../constants/header";
import { useAuth } from "../../contexts/AuthContext";
import { isProfileComplete, shouldDeferProfileCompletion } from "../../utils/profileCompletion";
import { authService } from "../../services/authService";

// PULLBACK NOTE: Remove WebAppShell wrapper to eliminate viewport constraint on web
// OLD: WebAppShell with surfaceMode handling constrains viewport on web
// NEW: Plain container matching root/stack pattern for full viewport control
// REASON: Map and stack layouts handle their own viewport; web should not be constrained

function UserStackScreens() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const segments = useSegments();
	const isTabsIndex = segments?.[0] === "(user)" && segments?.[1] === "(tabs)" && segments?.[2] === "index";
	const isStackRoute = segments?.[0] === "(user)" && segments?.[1] === "(stacks)";
	const onCompleteProfile =
		segments?.[0] === "(user)" &&
		segments?.[1] === "(stacks)" &&
		segments?.[2] === "complete-profile";

	// Auth guards: enforce authentication and profile completion
	useEffect(() => {
		// Don't redirect while auth is still loading
		if (loading) return;

		// Not authenticated → redirect to auth entry
		if (!user.isAuthenticated) {
			router.replace("/(auth)");
			return;
		}

		const deferProfileCompletion = shouldDeferProfileCompletion(user);
		const profileComplete = isProfileComplete(user);

		// Incomplete profile → redirect to complete-profile (unless already there or deferred)
		if (!profileComplete && !onCompleteProfile && !deferProfileCompletion) {
			router.replace("/(user)/(stacks)/complete-profile");
			return;
		}

		// Clear deferred flag once profile is complete
		if (profileComplete && deferProfileCompletion) {
			authService.clearEmergencyProfileCompletionDeferred().catch((error) => {
				console.warn("[UserLayout] Failed to clear deferred profile completion flag:", error);
			});
		}
	}, [loading, onCompleteProfile, router, segments, user]);

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

export default UserStackScreens;
