// App.js

import { registerRootComponent } from 'expo';
import ExpoRoot from 'expo-router/entry';

// 🔴 VERSION TRACKING: Log app version on startup
console.log('🚀 iVisit App Starting - v1.0.2.1 (Fixed Infinite Loop)');

// Register the main component
registerRootComponent(ExpoRoot);

/**
 * Entry point for the app
 * Simplified to reduce startup failures - updates are handled by expo-updates automatically
 */
export default function App() {
	return <ExpoRoot />;
}
