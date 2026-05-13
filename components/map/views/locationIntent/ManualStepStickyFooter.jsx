import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * ManualStepStickyFooter
 *
 * Docked outside MapStageBodyScroll - always visible regardless of scroll.
 * Back is a ghost pill; Next/Review is solid accent.
 *
 * Props
 * -----
 * onBack           () => void
 * onNext           () => void
 * nextLabel        string   - "Next", "Skip", "Review pickup", etc.
 * isLoading        bool
 * isDisabled       bool
 * titleColor       string
 * mutedColor       string
 * infoSurfaceColor string
 * accentColor      string   - primary CTA background
 */
export default function ManualStepStickyFooter({
	onBack,
	onNext,
	nextLabel = "Next",
	isLoading = false,
	isDisabled = false,
	titleColor,
	mutedColor,
	infoSurfaceColor,
	accentColor,
}) {
	const insets = useSafeAreaInsets();
	return (
		<View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
			{/* Ghost back button */}
			<Pressable
				onPress={onBack}
				accessibilityRole="button"
				accessibilityLabel="Back"
				style={({ pressed }) => [
					styles.button,
					styles.buttonBack,
					{ backgroundColor: infoSurfaceColor },
					pressed ? styles.buttonPressed : null,
				]}
			>
				<Text style={[styles.buttonLabel, { color: titleColor }]}>Back</Text>
			</Pressable>

			{/* Solid accent primary CTA */}
			<Pressable
				onPress={onNext}
				disabled={isDisabled || isLoading}
				accessibilityRole="button"
				accessibilityLabel={nextLabel}
				style={({ pressed }) => [
					styles.button,
					styles.buttonPrimary,
					{ backgroundColor: accentColor },
					pressed && !isDisabled && !isLoading ? styles.buttonPressed : null,
					isDisabled || isLoading ? styles.buttonDisabled : null,
				]}
			>
				{isLoading ? (
					<ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
				) : null}
				<Text style={styles.buttonPrimaryLabel}>{nextLabel}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	footer: {
		flexDirection: "row",
		gap: 10,
		paddingHorizontal: 14,
		paddingTop: 10,
	},
	button: {
		height: 46,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 6,
	},
	buttonBack: {
		flex: 1,
		borderRadius: 999,
		borderCurve: "continuous",
	},
	buttonPrimary: {
		flex: 2.5,
		borderRadius: 22,
		borderCurve: "continuous",
	},
	buttonPressed: {
		opacity: 0.82,
		transform: [{ scale: 0.98 }],
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	spinner: {
		marginRight: 2,
	},
	buttonLabel: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "600",
	},
	buttonPrimaryLabel: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "700",
		color: "#ffffff",
	},
});
