// PULLBACK NOTE: [LS-8] Extracted from MapLocationIntentStageParts.jsx
// OLD: isConfirming block (lines 875-1152) + action handlers lived in MapLocationIntentBodyContent
// NEW: standalone panel component - single responsibility, ~280 lines

// PULLBACK NOTE: [LS-UI-1] Unify decision panel icon styling with idle orb gradient style
// OLD: Flat TONE_PALETTE with single colors + alpha tint, no gradient
// NEW: Gradient arrays matching IntentOrb style, LinearGradient backgrounds
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
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
	resolveCandidateActionTone,
	renderActionIcon,
} from "./mapLocationIntent.helpers";
import { LOCATION_INTENT_MODES } from "./mapLocationIntent.model";
import { MAP_LOCATION_INTENT_COPY } from "./mapLocationIntent.content";
import styles from "./mapLocationIntent.styles";
import useResponsiveSurfaceMetrics from "../../../../hooks/ui/useResponsiveSurfaceMetrics";

// PULLBACK NOTE: [ls-refactor-1] Reference MAP_LOCATION_INTENT_COPY.placesOrbColors for DRY
// OLD: Duplicated gradient arrays in TONE_PALETTE
// NEW: Single source of truth from MAP_LOCATION_INTENT_COPY
const TONE_PALETTE = {
	pickup:      { gradient: ["#60A5FA", "#3B82F6"], iconBg: "#3B82F620", text: null },
	home:        { gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.home, iconBg: "#F9731620", text: null },
	work:        { gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.work, iconBg: "#8B5CF620", text: null },
	saved:       { gradient: ["#818CF8", "#6366F1"], iconBg: "#6366F120", text: null },
	family:      { gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.family, iconBg: "#EC489920", text: null },
	school:      { gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.school, iconBg: "#0284C720", text: null },
	pharmacy:    { gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.pharmacy, iconBg: "#05966920", text: null },
	care:        { gradient: MAP_LOCATION_INTENT_COPY.placesOrbColors.care, iconBg: "#E11D4820", text: null },
	success:     { gradient: ["#4ADE80", "#22C55E"], iconBg: "#22C55E20", text: "#22C55E" },
	danger:      { gradient: ["#F87171", "#EF4444"], iconBg: "#EF444420", text: "#EF4444" },
	positive:    { gradient: ["#4ADE80", "#22C55E"], iconBg: "#22C55E20", text: "#22C55E" },
	destructive: { gradient: ["#F87171", "#EF4444"], iconBg: "#EF444420", text: "#EF4444" },
	neutral:     { gradient: null, iconBg: null, text: null },
};

export default function MapLocationIntentCandidatePanel({
	mode,
	selectedLocation,
	pendingSaveCategory,
	savedPlaceFeedback,
	savedPlaces,
	isConfirmingSavedRemove,
	crudStatus,
	CRUD_STATUS,
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
		mode === LOCATION_INTENT_MODES.SAVE_SUCCESS ||
		mode === LOCATION_INTENT_MODES.SAVED_MANAGE;

	const isSaveCategory = mode === LOCATION_INTENT_MODES.SAVE_CATEGORY;
	const isSaveDetails = mode === LOCATION_INTENT_MODES.SAVE_DETAILS;
	const isSaveSuccess = mode === LOCATION_INTENT_MODES.SAVE_SUCCESS;
	const isSavedManage = mode === LOCATION_INTENT_MODES.SAVED_MANAGE;
	const isCrudSaving = crudStatus?.kind === CRUD_STATUS?.SAVING;
	const crudError = crudStatus?.kind === CRUD_STATUS?.FAILED ? crudStatus?.error : null;

	const pendingPlaceLabel = selectedLocation?.pendingPlaceLabel;
	const candidateActions = useMemo(
		() =>
			buildCandidateDecisionActions({
				selectedLocation,
				pendingPlaceLabel,
				savedPlaceFeedback,
				savedPlaces,
				canFindNearby: Boolean(onFindNearbyHospitals),
			}),
		[onFindNearbyHospitals, pendingPlaceLabel, savedPlaceFeedback, savedPlaces, selectedLocation],
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
							TONE_PALETTE[action?.tone],
							infoSurfaceColor,
							titleColor,
						);
						return (
							<React.Fragment key={action.id}>
								{index > 0 ? (
									<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								) : null}
								<Pressable
									onPress={() => onSavedManageAction?.(action)}
									disabled={isCrudSaving}
									accessibilityRole="button"
									accessibilityLabel={action.label}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
										isCrudSaving ? styles.disabledRow : null,
									]}
								>
									{renderActionIcon({
										iconName: action.isSolidOrb ? action.solidIcon || action.iconName : action.iconName,
										gradient: actionTone.gradient,
										iconBg: actionTone.iconBg,
										iconColor: actionTone.iconColor,
										infoSurfaceColor,
										iconStyle: styles.candidateActionIcon,
									})}
									<Text style={[styles.candidateActionText, { color: actionTone.textColor }]}>
										{action.label}
									</Text>
									{isCrudSaving && action.type === "remove" ? (
										<ActivityIndicator size="small" color={mutedColor} />
									) : action.type === "remove" && isConfirmingSavedRemove ? null : (
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
							TONE_PALETTE[action?.tone],
							infoSurfaceColor,
							titleColor,
						);
						return (
							<React.Fragment key={action.id}>
								{index > 0 ? (
									<View style={[styles.candidateActionDivider, { backgroundColor: mutedColor + "25" }]} />
								) : null}
								<Pressable
									onPress={() => onSelectSaveCategory?.(action.category)}
									disabled={isCrudSaving}
									accessibilityRole="button"
									accessibilityLabel={`Save as ${action.label}`}
									style={({ pressed }) => [
										styles.candidateActionRow,
										pressed ? styles.rowPressed : null,
										isCrudSaving ? styles.disabledRow : null,
									]}
								>
									{renderActionIcon({
										iconName: action.iconName,
										gradient: actionTone.gradient,
										iconBg: actionTone.iconBg,
										iconColor: actionTone.iconColor,
										infoSurfaceColor,
										iconStyle: styles.candidateActionIcon,
									})}
									<Text style={[styles.candidateActionText, { color: actionTone.textColor }]}>
										{action.label}
									</Text>
									{isCrudSaving ? (
										<ActivityIndicator size="small" color={mutedColor} />
									) : (
										<MaterialCommunityIcons name="chevron-right" size={16} color={mutedColor} />
									)}
								</Pressable>
							</React.Fragment>
						);
					})}
				</View>
			) : isSaveSuccess ? (
				// PULLBACK NOTE: [LS-UI-2] Post-save CTA panel for continuous user experience
				// OLD: No success state, abrupt return to decision panel
				// NEW: Success panel with CTAs to guide next actions
				<View style={[styles.saveDetailsCard, { backgroundColor: groupSurfaceColor }]}>
					<View style={styles.saveDetailsHeader}>
						{(() => {
							const actionTone = resolveCandidateActionTone(
								{ tone: "success" },
								TONE_PALETTE.success,
								infoSurfaceColor,
								titleColor,
							);
							return renderActionIcon({
								iconName: "check",
								gradient: actionTone.gradient,
								iconBg: actionTone.iconBg,
								iconColor: actionTone.iconColor,
								infoSurfaceColor,
								iconStyle: styles.candidateActionIcon,
							});
						})()}
						<View style={styles.saveDetailsCopy}>
							<Text style={[styles.manualTitle, { color: titleColor }]}>
								Saved
							</Text>
							<Text style={[styles.manualBody, { color: mutedColor }]}>
								{selectedLocation?.label || selectedLocation?.address || "This place"} is ready for pickup.
							</Text>
						</View>
					</View>
					<Pressable
						onPress={onConfirmSelection}
						accessibilityRole="button"
						accessibilityLabel="Use this location"
						style={({ pressed }) => [
							styles.saveDetailsPrimaryAction,
							{ backgroundColor: accentColor },
							pressed ? styles.rowPressed : null,
						]}
					>
						<MaterialCommunityIcons name="map-marker-check" size={18} color="#ffffff" />
						<Text style={[styles.manualStepButtonLabel, { color: "#ffffff" }]}>
							Use As Pickup
						</Text>
					</Pressable>
					<Pressable
						onPress={onBackToPreviousStep}
						accessibilityRole="button"
						accessibilityLabel="Done"
						style={({ pressed }) => [
							styles.saveDetailsPrimaryAction,
							{ backgroundColor: infoSurfaceColor, borderWidth: 1, borderColor: mutedColor + "30" },
							pressed ? styles.rowPressed : null,
						]}
					>
						<MaterialCommunityIcons name="check" size={18} color={titleColor} />
						<Text style={[styles.manualStepButtonLabel, { color: titleColor }]}>
							Done
						</Text>
					</Pressable>
				</View>
			) : isSaveDetails ? (
				<View style={[styles.saveDetailsCard, { backgroundColor: groupSurfaceColor }]}>
					<View style={styles.saveDetailsHeader}>
						{(() => {
							const actionTone = resolveCandidateActionTone(
								selectedSaveCategoryAction,
								TONE_PALETTE[selectedSaveCategoryAction?.tone],
								infoSurfaceColor,
								titleColor,
							);
							return renderActionIcon({
								iconName: selectedSaveCategoryAction?.iconName || "bookmark",
								gradient: actionTone.gradient,
								iconBg: actionTone.iconBg,
								iconColor: actionTone.iconColor,
								infoSurfaceColor,
								iconStyle: styles.candidateActionIcon,
							});
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
						disabled={isCrudSaving}
						accessibilityRole="button"
						accessibilityLabel="Save place details"
						style={({ pressed }) => [
							styles.saveDetailsPrimaryAction,
							{ backgroundColor: accentColor },
							pressed ? styles.rowPressed : null,
							isCrudSaving ? styles.disabledRow : null,
						]}
					>
						{isCrudSaving ? (
							<ActivityIndicator size="small" color="#ffffff" />
						) : null}
						<Text style={[styles.manualStepButtonLabel, { color: "#ffffff" }]}>
							{isCrudSaving ? "Saving" : "Save Place"}
						</Text>
					</Pressable>
				</View>
			) : (
				<View style={[styles.candidateActionGroup, { backgroundColor: groupSurfaceColor }]}>
					{candidateActions.map((action, index) => {
						const isStatus = action.type === "status";
						const actionTone = resolveCandidateActionTone(
							action,
							TONE_PALETTE[action?.tone],
							infoSurfaceColor,
							titleColor,
						);
						const content = (
							<>
								{renderActionIcon({
									iconName: action.isSolidOrb ? action.solidIcon || action.iconName : action.iconName,
									gradient: actionTone.gradient,
									iconBg: actionTone.iconBg,
									iconColor: actionTone.iconColor,
									infoSurfaceColor,
									iconStyle: styles.candidateActionIcon,
								})}
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
										disabled={isCrudSaving && action.type !== "pickup" && action.type !== "findNearby"}
										accessibilityRole="button"
										accessibilityLabel={action.label}
										style={({ pressed }) => [
											styles.candidateActionRow,
											pressed ? styles.rowPressed : null,
											isCrudSaving ? styles.disabledRow : null,
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
			{crudError ? (
				<View style={[styles.manualErrorRow, { marginTop: 2 }]}>
					<MaterialCommunityIcons name="alert-circle-outline" size={15} color="#EF4444" />
					<Text style={styles.manualErrorText}>{crudError}</Text>
				</View>
			) : null}
		</View>
	);
}
