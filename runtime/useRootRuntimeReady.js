// app/runtime/useRootRuntimeReady.js
// PULLBACK NOTE: Pass 1B - Created for shared runtime readiness state
// OLD: Components could not access root readiness without prop drilling
// NEW: Hook provides access to root runtime readiness if needed

import { useState, useEffect } from "react";

// Global state for runtime readiness (outside React for persistence across re-renders)
let globalRuntimeReady = false;
const listeners = new Set();

function notifyListeners(ready) {
	listeners.forEach(callback => callback(ready));
}

/**
 * Internal: Set global runtime readiness
 * Called by RootRuntimeGate when ready
 */
export function setGlobalRuntimeReady(ready) {
	globalRuntimeReady = ready;
	notifyListeners(ready);
}

/**
 * useRootRuntimeReady - Hook to access root runtime readiness
 *
 * Use case: Components that need to know if root runtime is ready
 * (e.g., analytics initialization, deep link handling)
 *
 * Note: Most components should not need this. RootRuntimeGate
 * blocks render until ready, so children only mount when ready.
 *
 * @returns {boolean} Whether root runtime is ready
 */
export function useRootRuntimeReady() {
	const [isReady, setIsReady] = useState(globalRuntimeReady);

	useEffect(() => {
		// Subscribe to changes
		const callback = (ready) => setIsReady(ready);
		listeners.add(callback);

		// Initial value (in case it changed before subscription)
		setIsReady(globalRuntimeReady);

		return () => {
			listeners.delete(callback);
		};
	}, []);

	return isReady;
}

/**
 * Check if root runtime is ready (synchronous)
 * Use for guards or conditional logic outside components
 */
export function isRootRuntimeReady() {
	return globalRuntimeReady;
}
