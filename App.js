// App.js

import { registerRootComponent } from 'expo';
import ExpoRoot from 'expo-router/entry';

// 🔴 VERSION TRACKING: Log app version on startup
console.log('🚀 iVisit App Starting - v1.0.2.1 (Global Location Context)');

// Register the main component
registerRootComponent(ExpoRoot);

/**
 * Entry point for the app
 * Simplified to reduce startup failures - updates are handled by expo-updates automatically
 * 
 * Global Location Context is initialized in _layout.js to ensure proper provider hierarchy
 */
export default function App() {
	return <ExpoRoot />;
}
