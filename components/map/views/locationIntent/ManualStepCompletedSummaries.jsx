import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CountryFlagGlyph from "../../../register/CountryFlagGlyph";
import { MANUAL_LOCATION_STEPS } from "./mapLocationIntent.model";
import countries from "../../../../data/countries";
import FadeEndText from "../../../ui/FadeEndText";

function findCountryFlag(countryCode) {
	if (!countryCode) return null;
	const match = countries.find(
		(c) => c.code.toUpperCase() === countryCode.toUpperCase(),
	);
	return match ? { flag: match.flag, code: match.code } : null;
}

const STEP_ICONS = {
	country: "earth",
	adminArea: "map-outline",
	city: "city-variant-outline",
	placeOrAddress: "map-marker-outline",
	unit: "home-outline",
	responderNote: "message-outline",
};

/**
 * ManualStepCompletedSummaries
 *
 * Renders locked, tappable rows for every completed step above the active one.
 * Tapping a row re-opens that step for editing.
 */
export default function ManualStepCompletedSummaries({
	manualDraft,
	currentStepIndex,
	onEditStep,
	titleColor,
	mutedColor,
	infoSurfaceColor,
	stepLabelOverrides = {},
}) {
	const completedSteps = MANUAL_LOCATION_STEPS.slice(0, currentStepIndex).filter(
		(step) => manualDraft[step.key],
	);

	const countryGlyph = findCountryFlag(manualDraft.countryCode);

	if (completedSteps.length === 0) return null;

	return (
		<View style={styles.container}>
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
									size={16}
								/>
							) : (
								<MaterialCommunityIcons name={iconName} size={15} color={mutedColor} />
							)}
						</View>

						{/* Label + value */}
						<View style={styles.rowCopy}>
							<FadeEndText
								text={stepLabelOverrides[step.key] || step.label}
								fadeColor={infoSurfaceColor}
								fadeWidth={22}
								fadeRadius={12}
								containerStyle={styles.rowLineFade}
								textStyle={[styles.rowLabel, { color: mutedColor }]}
								textProps={{ maxFontSizeMultiplier: 1.2 }}
							/>
							<FadeEndText
								text={value}
								fadeColor={infoSurfaceColor}
								fadeWidth={28}
								fadeRadius={12}
								containerStyle={styles.rowLineFade}
								textStyle={[styles.rowValue, { color: titleColor }]}
								textProps={{ maxFontSizeMultiplier: 1.3 }}
							/>
						</View>

						{/* Edit affordance */}
						<MaterialCommunityIcons name="chevron-right" size={14} color={mutedColor + "80"} />
					</Pressable>
				);
			})}

			{/* Separator before active step */}
			<View style={[styles.divider, { backgroundColor: mutedColor + "20" }]} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 2,
		marginBottom: 6,
	},
	row: {
		minHeight: 52,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 8,
		paddingHorizontal: 2,
		borderRadius: 12,
		borderCurve: "continuous",
	},
	iconTile: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	rowCopy: {
		flex: 1,
		minWidth: 0,
	},
	rowLineFade: {
		minWidth: 0,
	},
	rowLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	rowValue: {
		marginTop: 1,
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "600",
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		marginTop: 2,
		marginBottom: 4,
	},
});
