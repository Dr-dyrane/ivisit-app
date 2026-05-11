import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

/**
 * ManualStepStickyFooter
 *
 * Docked footer rendered OUTSIDE MapStageBodyScroll so that Back and
 * Next/Skip/Review-pickup CTAs are always visible regardless of scroll
 * position. Satisfies Issue 8 (sticky terminal CTA).
 *
 * Props
 * ─────
 * onBack         () => void
 * onNext         () => void
 * nextLabel      string   — "Next", "Skip", "Review pickup", etc.
 * isLoading      bool     — shows spinner on primary button
 * isDisabled     bool     — disables primary button
 * titleColor     string
 * infoSurfaceColor string
 */
export default function ManualStepStickyFooter({
	onBack,
	onNext,
	nextLabel = "Next",
	isLoading = false,
	isDisabled = false,
	titleColor,
	infoSurfaceColor,
}) {
	return (
		<View style={styles.footer}>
			<Pressable
				onPress={onBack}
				accessibilityRole="button"
				accessibilityLabel="Back"
				style={({ pressed }) => [
					styles.button,
					{ backgroundColor: infoSurfaceColor },
					pressed ? styles.buttonPressed : null,
				]}
			>
				<Text style={[styles.buttonLabel, { color: titleColor }]}>Back</Text>
			</Pressable>

			<Pressable
				onPress={onNext}
				disabled={isDisabled || isLoading}
				accessibilityRole="button"
				accessibilityLabel={nextLabel}
				style={({ pressed }) => [
					styles.button,
					styles.buttonPrimary,
					{ backgroundColor: infoSurfaceColor },
					pressed && !isDisabled && !isLoading ? styles.buttonPressed : null,
					isDisabled || isLoading ? styles.buttonDisabled : null,
				]}
			>
				{isLoading ? (
					<ActivityIndicator size="small" color={titleColor} />
				) : null}
				<Text style={[styles.buttonLabel, { color: titleColor }]}>
					{nextLabel}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	footer: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 14,
		paddingTop: 10,
		paddingBottom: 8,
	},
	button: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 6,
	},
	buttonPrimary: {
		minHeight: 46,
	},
	buttonPressed: {
		opacity: 0.82,
		transform: [{ scale: 0.98 }],
	},
	buttonDisabled: {
		opacity: 0.62,
	},
	buttonLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "600",
	},
});
