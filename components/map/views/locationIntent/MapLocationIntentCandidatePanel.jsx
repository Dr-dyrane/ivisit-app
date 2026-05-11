// PULLBACK NOTE: [LS-8] Extracted from MapLocationIntentStageParts.jsx
// OLD: isConfirming block (lines 875–1152) + action handlers lived in MapLocationIntentBodyContent
// NEW: standalone panel component — single responsibility, ~280 lines

import React, { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
	ResultsSection,
	SearchResultRow,
} from "../../surfaces/search/MapSearchSheetSections";
import {
	getMapSearchSheetResponsiveStyles,
	styles as searchStyles,
} from "../../surfaces/search/mapSearchSheet.styles";
import {
	buildCandidateDecisionActions,
	buildSaveCategoryActions,
	buildSavedPlaceManageActions,
} from "./mapLocationIntent.helpers";
import { LOCATION_INTENT_MODES } from "./mapLocationIntent.model";
import styles from "./mapLocationIntent.styles";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";

// Semantic colour map — one entry per tone emitted by the action builders.
// iconBg is the 14% alpha tint applied behind the icon orb.
const TONE_PALETTE = {
	pickup:      { icon: "#3B82F6", iconBg: "#3B82F620", text: null },   // blue — primary action
	home:        { icon: "#F97316", iconBg: "#F9731620", text: null },   // orange — home warmth
	work:        { icon: "#8B5CF6", iconBg: "#8B5CF620", text: null },   // purple — work
	saved:       { icon: "#6366F1", iconBg: "#6366F120", text: null },   // indigo — bookmark
	family:      { icon: "#EC4899", iconBg: "#EC489920", text: null },   // pink — family
	school:      { icon: "#0EA5E9", iconBg: "#0EA5E920", text: null },   // sky — school
	pharmacy:    { icon: "#10B981", iconBg: "#10B98120", text: null },   // emerald — medical
	care:        { icon: "#EF4444", iconBg: "#EF444420", text: null },   // red — care/hospital
	success:     { icon: "#22C55E", iconBg: "#22C55E20", text: "#22C55E" }, // green — confirmed
	danger:      { icon: "#EF4444", iconBg: "#EF444420", text: "#EF4444" }, // red — destructive
	positive:    { icon: "#22C55E", iconBg: "#22C55E20", text: "#22C55E" },
	destructive: { icon: "#EF4444", iconBg: "#EF444420", text: "#EF4444" },
	neutral:     { icon: null,      iconBg: null,         text: null },
};

function resolveCandidateActionTone(action, infoSurfaceColor, titleColor, mutedColor) {
	const palette = TONE_PALETTE[action?.tone];
	return {
		iconBackgroundColor: palette?.iconBg ?? infoSurfaceColor,
		iconColor: palette?.icon ?? titleColor,
		textColor: palette?.text ?? titleColor,
	};
}

export default function MapLocationIntentCandidatePanel({
	mode,
	selectedLocation,
	pendingSaveCategory,
	savedPlaceFeedback,
	isConfirmingSavedRemove,
	saveDetailsDraft,
	titleColor,
	mutedColor,
	groupSurfaceColor,
	infoSurfaceColor,
	heroSurfaceColor,
	isDarkMode,
	accentColor,
	onConfirmSelection,
	onFindNearbyHospitals,
	onOpenSaveCategory,
	onSaveSelectedLocationAs,
	onSelectSaveCategory,
	onSavedManageAction,
	onSaveDetailsDraftChange,
	onConfirmSaveDetails,
	onBackToPreviousStep,
}) {
	const searchViewportMetrics = useResponsiveSurfaceMetrics({ presentationMode: "sheet" });
	const searchResponsiveStyles = useMemo(
		() => getMapSearchSheetResponsiveStyles(searchViewportMetrics),
		[searchViewportMetrics],
	);

	const isConfirming =
		mode === LOCATION_INTENT_MODES.CONFIRM ||
		mode === LOCATION_INTENT_MODES.CANDIDATE_DECISION ||
		mode === LOCATION_INTENT_MODES.SAVE_CATEGORY ||
		mode === LOCATION_INTENT_MODES.SAVE_DETAILS ||
		mode === LOCATION_INTENT_MODES.SAVED_MANAGE;

	const isSaveCategory = mode === LOCATION_INTENT_MODES.SAVE_CATEGORY;
	const isSaveDetails = mode === LOCATION_INTENT_MODES.SAVE_DETAILS;
	const isSavedManage = mode === LOCATION_INTENT_MODES.SAVED_MANAGE;

	const pendingPlaceLabel = selectedLocation?.pendingPlaceLabel;
	const candidateActions = useMemo(
		() =>
			buildCandidateDecisionActions({
				selectedLocation,
				pendingPlaceLabel,
				savedPlaceFeedback,
				canFindNearby: Boolean(onFindNearbyHospitals),
			}),
		[onFindNearbyHospitals, pendingPlaceLabel, savedPlaceFeedback, selectedLocation],
	);
	const pendingPlaceTitle = candidateActions[0]?.saveLabel
		? candidateActions[0]?.label
		: null;

	const saveCategoryActions = useMemo(() => buildSaveCategoryActions(), []);
	const selectedSaveCategoryAction =
		saveCategoryActions.find((action) => action.category === pendingSaveCategory) ||
		saveCategoryActions.find((action) => action.category === "other");
	const savedManageActions = useMemo(
		() => buildSavedPlaceManageActions({ confirmRemove: isConfirmingSavedRemove }),
		[isConfirmingSavedRemove],
	);

	if (!isConfirming) return null;

	const handleCandidateAction = (action) => {
		if (!action || action.type === "status") return;
		if (action.type === "pickup") {
			onConfirmSelection?.();
			return;
		}
		if (action.type === "saveCategory") {
			onOpenSaveCategory?.();
			return;
		}
		if (action.type === "save") {
			onSaveSelectedLocationAs?.(action.saveLabel);
			return;
		}
		if (action.type === "findNearby") {
			onFindNearbyHospitals?.(selectedLocation);
			return;
		}
		if (action.type === "back") {
			onBackToPreviousStep?.();
		}
	};

	return (
		<View style={styles.candidateDecisionStack}>
			<View style={[searchStyles.resultGroup, { backgroundColor: groupSurfaceColor }]}>
				<SearchResultRow
					iconName="location-outline"
					title={selectedLocation?.label || pendingPlaceTitle || "Selected location"}
					subtitle={
						selectedLocation?.address ||
						"Use this location for pickup, nearby care, and pricing."
					}
					meta={pendingPlaceTitle || "Selected address"}
					titleColor={titleColor}
					mutedColor={mutedColor}
					surfaceColor={heroSurfaceColor}
					isDarkMode={isDarkMode}
					isSelected
					responsiveStyles={searchResponsiveStyles}
				/>
			</View>

			{isSavedManage ? (
				<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
					{savedManageActions.map((action, index) => {
						const actionTone = resolveCandidateActionTone(
							action,
							infoSurfaceColor,
							titleColor,
							mutedColor,
						);
						return (
							<React.Fragment key={action.id}>
								{index > 0 ? (
									<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								) : null}
								<Pressable
									onPress={() => onSavedManageAction?.(action)}
									accessibilityRole="button"
									accessibilityLabel={action.label}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
									]}
								>
									<View style={[styles.candidateActionIcon, { backgroundColor: actionTone.iconBackgroundColor }]}>
										<MaterialCommunityIcons name={action.iconName} size={18} color={actionTone.iconColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: actionTone.textColor }]}>
										{action.label}
									</Text>
									{action.type === "remove" && isConfirmingSavedRemove ? null : (
										<MaterialCommunityIcons name="chevron-right" size={16} color={mutedColor} />
									)}
								</Pressable>
							</React.Fragment>
						);
					})}
				</View>
			) : isSaveCategory ? (
				<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
					{saveCategoryActions.map((action, index) => {
						const actionTone = resolveCandidateActionTone(
							action,
							infoSurfaceColor,
							titleColor,
							mutedColor,
						);
						return (
							<React.Fragment key={action.id}>
								{index > 0 ? (
									<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								) : null}
								<Pressable
									onPress={() => onSelectSaveCategory?.(action.category)}
									accessibilityRole="button"
									accessibilityLabel={`Save as ${action.label}`}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
									]}
								>
									<View style={[styles.candidateActionIcon, { backgroundColor: actionTone.iconBackgroundColor }]}>
										<MaterialCommunityIcons name={action.iconName} size={18} color={actionTone.iconColor} />
									</View>
									<Text style={[styles.candidateActionText, { color: actionTone.textColor }]}>
										{action.label}
									</Text>
									<MaterialCommunityIcons name="chevron-right" size={16} color={mutedColor} />
								</Pressable>
							</React.Fragment>
						);
					})}
				</View>
			) : isSaveDetails ? (
				<View style={[styles.saveDetailsCard, { backgroundColor: groupSurfaceColor }]}>
					<View style={styles.saveDetailsHeader}>
						{(() => {
							const actionTone = resolveCandidateActionTone(
								selectedSaveCategoryAction,
								infoSurfaceColor,
								titleColor,
								mutedColor,
							);
							return (
								<View style={[styles.candidateActionIcon, { backgroundColor: actionTone.iconBackgroundColor }]}>
									<MaterialCommunityIcons
										name={selectedSaveCategoryAction?.iconName || "bookmark"}
										size={18}
										color={actionTone.iconColor}
									/>
								</View>
							);
						})()}
						<View style={styles.saveDetailsCopy}>
							<Text style={[styles.manualTitle, { color: titleColor }]}>
								{selectedSaveCategoryAction?.label || "Saved Place"}
							</Text>
							<Text style={[styles.manualBody, { color: mutedColor }]}>
								Name it so it is easy to recognize later.
							</Text>
						</View>
					</View>
					<TextInput
						value={saveDetailsDraft?.label || ""}
						onChangeText={(value) => onSaveDetailsDraftChange?.("label", value)}
						placeholder="Place name"
						placeholderTextColor={mutedColor}
						autoCapitalize="words"
						autoCorrect={false}
						autoFocus
						style={[styles.manualTextInput, { backgroundColor: infoSurfaceColor, color: titleColor }]}
					/>
					<TextInput
						value={saveDetailsDraft?.unit || ""}
						onChangeText={(value) => onSaveDetailsDraftChange?.("unit", value)}
						placeholder="Apartment, unit, or landmark"
						placeholderTextColor={mutedColor}
						autoCapitalize="sentences"
						autoCorrect={false}
						style={[styles.manualTextInput, { backgroundColor: infoSurfaceColor, color: titleColor }]}
					/>
					<TextInput
						value={saveDetailsDraft?.responderNote || ""}
						onChangeText={(value) => onSaveDetailsDraftChange?.("responderNote", value)}
						placeholder="Note for responders"
						placeholderTextColor={mutedColor}
						autoCapitalize="sentences"
						autoCorrect={false}
						multiline
						style={[
							styles.manualTextInput,
							styles.manualTextInputMultiline,
							{ backgroundColor: infoSurfaceColor, color: titleColor },
						]}
					/>
					<Pressable
						onPress={onConfirmSaveDetails}
						accessibilityRole="button"
						accessibilityLabel="Save place details"
						style={({ pressed }) => [
							styles.saveDetailsPrimaryAction,
							{ backgroundColor: accentColor },
							pressed ? styles.rowPressed : null,
						]}
					>
						<Text style={[styles.manualStepButtonLabel, { color: "#ffffff" }]}>
							Save Place
						</Text>
					</Pressable>
				</View>
			) : (
				<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
					{candidateActions.map((action, index) => {
						const isStatus = action.type === "status";
						const actionTone = resolveCandidateActionTone(
							action,
							infoSurfaceColor,
							titleColor,
							mutedColor,
						);
						const content = (
							<>
								<View style={[styles.candidateActionIcon, { backgroundColor: actionTone.iconBackgroundColor }]}>
									<MaterialCommunityIcons name={action.iconName} size={18} color={actionTone.iconColor} />
								</View>
								<Text style={[styles.candidateActionText, { color: actionTone.textColor }]}>
									{action.label}
								</Text>
								{isStatus || action.type === "back" ? null : (
									<MaterialCommunityIcons name="chevron-right" size={16} color={mutedColor} />
								)}
							</>
						);
						return (
							<React.Fragment key={action.id}>
								{index > 0 ? (
									<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								) : null}
								{isStatus ? (
									<View style={styles.candidateActionRow}>{content}</View>
								) : (
									<Pressable
										onPress={() => handleCandidateAction(action)}
										accessibilityRole="button"
										accessibilityLabel={action.label}
										style={({ pressed }) => [
											styles.candidateActionRow,
											pressed ? styles.rowPressed : null,
										]}
									>
										{content}
									</Pressable>
								)}
							</React.Fragment>
						);
					})}
				</View>
			)}
		</View>
	);
}
