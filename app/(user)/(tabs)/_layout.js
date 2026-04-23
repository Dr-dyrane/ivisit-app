// app/(user)/(tabs)/_layout.js
//
// Legacy compatibility only. The authenticated app no longer owns a bottom-tab
// navigator; `/map` is the primary home and Visits now lives in the stack group.

import { Stack } from "expo-router";

// PULLBACK NOTE: Remove WebAppShell - only applies to web, causes issues on Android
// OLD: WebAppShell wrapper with surfaceMode handling
// NEW: Plain Stack matching auth layout pattern for platform-specific handling
export default function LegacyTabsCompatibilityLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "none",
			}}
		/>
	);
}
