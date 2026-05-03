import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * useReducedMotion
 *
 * Subscribes to the system reduce-motion accessibility setting.
 * Returns true when the user has requested reduced motion.
 * Defaults to false until the async check resolves.
 */
export function useReducedMotion() {
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
		return () => sub?.remove();
	}, []);

	return reduceMotion;
}
