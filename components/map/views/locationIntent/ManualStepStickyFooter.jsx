import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

/**
 * ManualStepStickyFooter
 *
 * Docked outside MapStageBodyScroll — always visible regardless of scroll.
 * Back is a ghost pill; Next/Review is solid accent.
 *
 * Props
 * ─────
 * onBack           () => void
 * onNext           () => void
 * nextLabel        string   — "Next", "Skip", "Review pickup", etc.
 * isLoading        bool
 * isDisabled       bool
 * titleColor       string
 * mutedColor       string
 * infoSurfaceColor string
 * accentColor      string   — primary CTA background
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
	return (
		<View style={styles.footer}>
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
					{ backgroundColor: accentColor || "#3B82F6" },
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
		paddingBottom: 8,
	},
	button: {
		minHeight: 46,
		borderRadius: 14,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 6,
	},
	buttonBack: {
		flex: 1,
	},
	buttonPrimary: {
		flex: 2,
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
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "600",
	},
	buttonPrimaryLabel: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "700",
		color: "#ffffff",
	},
});
