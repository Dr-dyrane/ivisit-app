// app/_layout.js
import "../polyfills";
import * as WebBrowser from "expo-web-browser";
import { RootRuntimeGate } from "./runtime/RootRuntimeGate";
import { RootProviders } from "./runtime/RootProviders";
import { RootNavigator } from "./runtime/RootNavigator";

WebBrowser.maybeCompleteAuthSession();

/**
 * Root Layout - Composition Only
 *
 * Architectural Rule: The router is only the shell.
 *
 * This file contains NO:
 * - State
 * - Effects
 * - Logic
 * - Helper functions
 * - Inline components
 *
 * It ONLY imports and composes:
 * - RootRuntimeGate: Startup readiness, splash, migrations
 * - RootProviders: Provider nesting
 * - RootNavigator: Stack definitions, routing logic
 */
export default function RootLayout() {
	return (
		<RootRuntimeGate>
			<RootProviders>
				<RootNavigator />
			</RootProviders>
		</RootRuntimeGate>
	);
}
