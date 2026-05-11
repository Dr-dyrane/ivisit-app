import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CountryFlagGlyph from "../../../register/CountryFlagGlyph";
import { MANUAL_LOCATION_STEPS } from "./mapLocationIntent.model";
import countries from "../../../../data/countries";

// Build a human-readable one-liner from whatever fields are filled
function buildAddressLine(draft) {
	const parts = [
		draft.streetAddress,
		draft.city,
		draft.stateRegion,
		draft.country,
	].filter(Boolean);
	return parts.join(", ");
}

function findCountryFlag(countryCode) {
	if (!countryCode) return null;
	const match = countries.find(
		(c) => c.code.toUpperCase() === countryCode.toUpperCase(),
	);
	return match ? { flag: match.flag, code: match.code } : null;
}

const STEP_ICONS = {
	country: "globe-outline",
	stateRegion: "map-outline",
	city: "business-outline",
	streetAddress: "location-outline",
	unit: "home-outline",
	responderNote: "chatbubble-ellipses-outline",
};

/**
 * ManualStepCompletedSummaries
 *
 * Renders two zones:
 *  1. Live address pill — grows as fields are filled, sits at the top of the
 *     card so the user always sees what they've built so far.
 *  2. Locked field rows — one per completed step, tappable to edit.
 */
export default function ManualStepCompletedSummaries({
	manualDraft,
	currentStepIndex,
	onEditStep,
	titleColor,
	mutedColor,
	infoSurfaceColor,
	accentColor,
}) {
	const completedSteps = MANUAL_LOCATION_STEPS.slice(0, currentStepIndex).filter(
		(step) => manualDraft[step.key],
	);

	const addressLine = buildAddressLine(manualDraft);
	const countryGlyph = findCountryFlag(manualDraft.countryCode);

	if (completedSteps.length === 0) return null;

	return (
		<View style={styles.container}>
			{/* ── Live address pill ─────────────────────────────── */}
			{addressLine ? (
				<View style={[styles.addressPill, { backgroundColor: infoSurfaceColor }]}>
					{countryGlyph ? (
						<CountryFlagGlyph
							flag={countryGlyph.flag}
							code={countryGlyph.code}
							size={16}
							style={styles.pillFlag}
						/>
					) : (
						<Ionicons name="location" size={14} color={accentColor} style={styles.pillIcon} />
					)}
					<Text
						numberOfLines={2}
						style={[styles.addressPillText, { color: titleColor }]}
					>
						{addressLine}
					</Text>
				</View>
			) : null}

			{/* ── Locked field rows ─────────────────────────────── */}
			<View style={styles.lockedRows}>
				{completedSteps.map((step, idx) => {
					const value = manualDraft[step.key];
					const isCountry = step.key === "country";
					const iconName = STEP_ICONS[step.key] || "ellipse-outline";

					return (
						<Pressable
							key={step.key}
							onPress={() => onEditStep(idx)}
							accessibilityRole="button"
							accessibilityLabel={`Edit ${step.label}: ${value}`}
							style={({ pressed }) => [
								styles.row,
								{ backgroundColor: pressed ? infoSurfaceColor : "transparent" },
							]}
						>
							{/* Icon / flag tile */}
							<View style={[styles.iconTile, { backgroundColor: infoSurfaceColor }]}>
								{isCountry && countryGlyph ? (
									<CountryFlagGlyph
										flag={countryGlyph.flag}
										code={countryGlyph.code}
										size={14}
									/>
								) : (
									<Ionicons name={iconName} size={13} color={mutedColor} />
								)}
							</View>

							{/* Label + value */}
							<View style={styles.rowCopy}>
								<Text
									numberOfLines={1}
									style={[styles.rowLabel, { color: mutedColor }]}
								>
									{step.label}
								</Text>
								<Text
									numberOfLines={1}
									style={[styles.rowValue, { color: titleColor }]}
								>
									{value}
								</Text>
							</View>

							{/* Edit chevron */}
							<Ionicons name="pencil-outline" size={13} color={mutedColor} />
						</Pressable>
					);
				})}
			</View>

			{/* Separator before active field */}
			<View style={[styles.divider, { backgroundColor: mutedColor + "20" }]} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 6,
		marginBottom: 4,
	},
	// Address pill
	addressPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 14,
		borderCurve: "continuous",
	},
	pillFlag: {
		flexShrink: 0,
	},
	pillIcon: {
		flexShrink: 0,
	},
	addressPillText: {
		flex: 1,
		minWidth: 0,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "600",
		letterSpacing: -0.1,
	},
	// Locked rows
	lockedRows: {
		gap: 0,
	},
	row: {
		minHeight: 40,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 5,
		paddingHorizontal: 4,
		borderRadius: 10,
		borderCurve: "continuous",
	},
	iconTile: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	rowCopy: {
		flex: 1,
		minWidth: 0,
	},
	rowLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	rowValue: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "600",
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginTop: 4,
	},
});
