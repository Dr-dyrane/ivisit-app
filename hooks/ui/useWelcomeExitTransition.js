import { useRef, useCallback } from "react";
import { Animated } from "react-native";

const EXIT_DURATION = 150;
const RECOVERY_TIMEOUT_MS = 5000;

/**
 * useWelcomeExitTransition
 *
 * Owns the 150ms opacity fade-out that precedes router.replace on the Welcome screen.
 * Also owns the 5s safety timeout that resets `isOpeningEmergency` if navigation hangs.
 *
 * Returns:
 *   - screenOpacity: Animated.Value — wire to the root Animated.View opacity
 *   - startExitTransition(onComplete): fades to 0 then calls onComplete()
 *   - resetOpacity(): snaps opacity back to 1 (call on focus restore or timeout recovery)
 */
export function useWelcomeExitTransition() {
	const screenOpacity = useRef(new Animated.Value(1)).current;
	const recoveryTimerRef = useRef(null);

	const resetOpacity = useCallback(() => {
		screenOpacity.setValue(1);
	}, [screenOpacity]);

	const startExitTransition = useCallback(
		(onComplete, { onRecovery } = {}) => {
			if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);

			recoveryTimerRef.current = setTimeout(() => {
				onRecovery?.();
				resetOpacity();
			}, RECOVERY_TIMEOUT_MS);

			Animated.timing(screenOpacity, {
				toValue: 0,
				duration: EXIT_DURATION,
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) {
					onComplete?.();
				}
			});
		},
		[screenOpacity, resetOpacity],
	);

	return { screenOpacity, startExitTransition, resetOpacity };
}
