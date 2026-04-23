// app/(user)/(tabs)/_layout.js
//
// Legacy compatibility only. The authenticated app no longer owns a bottom-tab
// navigator; `/map` is the primary home and Visits now lives in the stack group.

import { Stack } from "expo-router";

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
