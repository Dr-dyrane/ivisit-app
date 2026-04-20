import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { useEmergencyContacts } from "../../../../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../../../../hooks/user/useMedicalProfile";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { MapCommitDetailsTopSlot } from "../commitDetails/MapCommitDetailsStageParts";
import { MAP_COMMIT_TRIAGE_COPY } from "./mapCommitTriage.content";
import {
	applyCommitTriageSelection,
	buildCommitTriageSelectionState,
	buildCommitTriageSnapshot,
	buildMapCommitTriageSteps,
	getCommitTriageOptionWidthStyle,
	getTriageOptionIcon,
	hasMeaningfulTriageDraftData,
	isCriticalTriageDraft,
	normalizeCommitTriageDraft,
	sanitizeCommitTriageNote,
} from "./mapCommitTriage.helpers";
import styles from "./mapCommitTriage.styles";

export default function MapCommitTriageStageBase({
	sheetHeight,
	snapState,
	hospital,
	transport,
	payload = null,
	onBack,
	onClose,
	onConfirm,
	onSnapStateChange,
}) {
	const effectiveSnapState = MAP_SHEET_SNAP_STATES.EXPANDED;
	const { isDarkMode } = useTheme();
	const { setCommitFlow, hospitals, selectedSpecialty } = useEmergency();
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const {
		isSidebarPresentation,
		contentMaxWidth,
		presentationMode,
		shellWidth,
	} = useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const allowedSnapStates = useMemo(() => [MAP_SHEET_SNAP_STATES.EXPANDED], []);
	const {
		allowScrollDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel,
		handleSnapToggle,
	} = useMapSheetDetents({
		snapState: effectiveSnapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
	});
	const {
		androidExpandedBodyGesture,
		androidExpandedBodyStyle,
		handleAndroidCollapseScroll,
		handleAndroidCollapseScrollBeginDrag,
	} = useMapAndroidExpandedCollapse({
		snapState: effectiveSnapState,
		onSnapStateChange,
		bodyScrollRef,
		onScroll: handleBodyScroll,
		onScrollBeginDrag: handleBodyScrollBeginDrag,
	});
	const webWideInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideContentInset
			: null;
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;

	const titleColor = tokens.titleColor;
	const mutedColor = tokens.mutedText;
	const closeSurface = tokens.closeSurface;
	const accentColor = isDarkMode ? "#FCA5A5" : "#86100E";
	const dangerColor = isDarkMode ? "#FCA5A5" : "#B91C1C";
	const orbSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.05)";
	const optionSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.04)";
	const optionSelectedSurfaceColor = isDarkMode
		? "rgba(252,165,165,0.16)"
		: "rgba(134,16,14,0.10)";
	const optionSelectedBorderColor = isDarkMode ? "#FCA5A5" : "#86100E";
	const secondarySurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.05)";
	const noteSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.05)"
		: "rgba(255,255,255,0.74)";
	const noteBorderColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.06)";

	const initialDraft = useMemo(
		() =>
			normalizeCommitTriageDraft(
				payload?.triageDraft ||
					payload?.triageSnapshot?.signals?.userCheckin ||
					null,
			),
		[payload?.triageDraft, payload?.triageSnapshot?.signals?.userCheckin],
	);
	const [draft, setDraft] = useState(initialDraft);
	const [showExtendedComplaints, setShowExtendedComplaints] = useState(
		Boolean(payload?.showExtendedComplaints),
	);
	const steps = useMemo(
		() => buildMapCommitTriageSteps(showExtendedComplaints),
		[showExtendedComplaints],
	);
	const [activeStepId, setActiveStepId] = useState(
		payload?.activeStep || steps[0]?.id || "chiefComplaint",
	);

	useEffect(() => {
		setDraft(initialDraft);
	}, [initialDraft]);

	useEffect(() => {
		setShowExtendedComplaints(Boolean(payload?.showExtendedComplaints));
	}, [payload?.showExtendedComplaints]);

	useEffect(() => {
		if (!payload?.activeStep) return;
		setActiveStepId(payload.activeStep);
	}, [payload?.activeStep]);

	useEffect(() => {
		if (!steps.some((step) => step.id === activeStepId)) {
			setActiveStepId(steps[0]?.id || "chiefComplaint");
		}
	}, [activeStepId, steps]);

	const activeStepIndex = Math.max(
		0,
		steps.findIndex((step) => step.id === activeStepId),
	);
	const activeStep = steps[activeStepIndex] || steps[0] || null;
	const isCritical = useMemo(() => isCriticalTriageDraft(draft), [draft]);
	const progressLabel = `${activeStepIndex + 1} of ${steps.length}`;
	const transportTitle =
		transport?.title || transport?.service_name || transport?.label || "Transport";
	const roomTitle =
		payload?.room?.title ||
		payload?.room?.room_type ||
		payload?.room?.service_name ||
		"Bed booking";
	const selectionLabel =
		payload?.careIntent === "both"
			? "Transport + admission"
			: payload?.careIntent === "bed"
				? roomTitle
				: transportTitle;
	const hospitalName =
		hospital?.name || hospital?.title || hospital?.service_name || "";
	const headerSubtitle = [hospitalName, selectionLabel].filter(Boolean).join(" · ");

	const triageSnapshot = useMemo(
		() =>
			buildCommitTriageSnapshot({
				triageDraft: draft,
				hospitals,
				hospitalId: hospital?.id || null,
				serviceType: payload?.careIntent === "bed" && !transport ? "bed" : "ambulance",
				specialty: selectedSpecialty || null,
				medicalProfile,
				emergencyContacts,
			}),
		[
			draft,
			emergencyContacts,
			hospital?.id,
			hospitals,
			medicalProfile,
			payload?.careIntent,
			selectedSpecialty,
			transport,
		],
	);

	const persistCommitFlow = useCallback(
		(nextDraft, nextStepId, nextShowExtendedComplaints) => {
			setCommitFlow?.({
				phase: "commit_triage",
				phaseSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
				hospital,
				hospitalId: hospital?.id || null,
				transport: transport || null,
				draft: payload?.draft || null,
				triageDraft: hasMeaningfulTriageDraftData(nextDraft) ? nextDraft : null,
				triageSnapshot:
					hasMeaningfulTriageDraftData(nextDraft) &&
					nextStepId &&
					buildCommitTriageSnapshot({
						triageDraft: nextDraft,
						hospitals,
						hospitalId: hospital?.id || null,
						serviceType:
							payload?.careIntent === "bed" && !transport ? "bed" : "ambulance",
						specialty: selectedSpecialty || null,
						medicalProfile,
						emergencyContacts,
					}),
				activeStep: nextStepId || null,
				showExtendedComplaints: Boolean(nextShowExtendedComplaints),
				careIntent: payload?.careIntent || null,
				roomId: payload?.roomId || null,
				room: payload?.room || null,
				sourcePhase: payload?.sourcePhase || null,
				sourceSnapState: payload?.sourceSnapState || null,
				sourcePayload: payload?.sourcePayload || null,
			});
		},
		[
			emergencyContacts,
			hospital,
			hospitals,
			medicalProfile,
			payload,
			selectedSpecialty,
			setCommitFlow,
			transport,
		],
	);

	useEffect(() => {
		persistCommitFlow(draft, activeStep?.id || null, showExtendedComplaints);
	}, [activeStep?.id, draft, persistCommitFlow, showExtendedComplaints]);

	const advance = useCallback(() => {
		if (activeStepIndex >= steps.length - 1) {
			onConfirm?.(hospital, transport, {
				draft: payload?.draft || null,
				triageDraft: hasMeaningfulTriageDraftData(draft) ? draft : null,
				triageSnapshot,
				careIntent: payload?.careIntent || null,
				roomId: payload?.roomId || null,
				room: payload?.room || null,
				showExtendedComplaints,
			});
			return;
		}

		setActiveStepId(steps[activeStepIndex + 1]?.id || activeStepId);
	}, [
		activeStepId,
		activeStepIndex,
		draft,
		hospital,
		onConfirm,
		payload?.careIntent,
		payload?.draft,
		payload?.room,
		payload?.roomId,
		showExtendedComplaints,
		steps,
		transport,
		triageSnapshot,
	]);

	const handleBack = useCallback(() => {
		if (activeStepIndex <= 0) {
			onBack?.();
			return;
		}

		setActiveStepId(steps[activeStepIndex - 1]?.id || steps[0]?.id);
	}, [activeStepIndex, onBack, steps]);

	const handleSkip = useCallback(() => {
		if (activeStep?.type === "text") {
			setDraft((currentDraft) => ({
				...currentDraft,
				note: "",
			}));
		}
		advance();
	}, [activeStep?.type, advance]);

	const handleSelectOption = useCallback(
		(optionValue) => {
			if (!activeStep) return;
			const nextDraft = applyCommitTriageSelection(activeStep, optionValue, draft);
			setDraft(nextDraft);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
			setTimeout(() => {
				if (activeStep.id === "chiefComplaint" && showExtendedComplaints) {
					setShowExtendedComplaints(false);
				}
				advance();
			}, 90);
		},
		[activeStep, advance, draft, showExtendedComplaints],
	);

	const handleNoteChange = useCallback((nextValue) => {
		setDraft((currentDraft) => ({
			...currentDraft,
			note: sanitizeCommitTriageNote(nextValue),
		}));
	}, []);

	const orbSize = Math.round(
		Math.min(88, Math.max(72, (stageMetrics?.height || 852) * 0.108)),
	);
	const orbRadius = Math.round(orbSize / 2);
	const orbIconSize = Math.round(orbSize * 0.42);

	if (!activeStep) return null;

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={effectiveSnapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapCommitDetailsTopSlot
					title={activeStep.headerTitle || MAP_COMMIT_TRIAGE_COPY.HEADER_TITLE}
					subtitle={headerSubtitle ? `For ${headerSubtitle}` : "For this request"}
					onBack={handleBack}
					onClose={onClose}
					titleColor={titleColor}
					mutedColor={mutedColor}
					closeSurface={closeSurface}
				/>
			}
			onHandlePress={handleSnapToggle}
		>
			<MapStageBodyScroll
				bodyScrollRef={bodyScrollRef}
				viewportStyle={sheetStageStyles.bodyScrollViewport}
				contentContainerStyle={[
					sheetStageStyles.bodyScrollContent,
					sheetStageStyles.bodyScrollContentSheet,
					presentationMode === "modal"
						? sheetStageStyles.bodyScrollContentModal
						: null,
					isSidebarPresentation
						? sheetStageStyles.bodyScrollContentPanel
						: null,
					isSidebarPresentation
						? sheetStageStyles.bodyScrollContentSidebar
						: null,
					modalContainedStyle,
					styles.bodyContent,
					webWideInsetStyle,
				]}
				isSidebarPresentation={isSidebarPresentation}
				allowScrollDetents={allowScrollDetents}
				handleBodyWheel={handleBodyWheel}
				onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
				onScroll={handleAndroidCollapseScroll}
				onScrollEndDrag={handleBodyScrollEndDrag}
				scrollEnabled={bodyScrollEnabled}
				androidExpandedBodyGesture={androidExpandedBodyGesture}
				androidExpandedBodyStyle={androidExpandedBodyStyle}
			>
				<View style={styles.stage}>
					<View style={styles.heroBlock}>
						<View
							style={[
								styles.avatarOrb,
								{
									width: orbSize,
									height: orbSize,
									borderRadius: orbRadius,
									backgroundColor: orbSurfaceColor,
								},
							]}
						>
							<Ionicons
								name={activeStep.type === "text" ? "document-text-outline" : "medkit-outline"}
								size={orbIconSize}
								color={mutedColor}
							/>
						</View>
						<Text style={[styles.progressText, { color: mutedColor }]}>
							{progressLabel}
						</Text>
						<Text style={[styles.promptText, { color: titleColor }]}>
							{activeStep.prompt}
						</Text>
						{isCritical ? (
							<View
								style={[
									styles.priorityPill,
									{ backgroundColor: isDarkMode ? "rgba(252,165,165,0.16)" : "rgba(185,28,28,0.10)" },
								]}
							>
								<Text style={[styles.priorityText, { color: dangerColor }]}>
									{MAP_COMMIT_TRIAGE_COPY.PRIORITY_BADGE}
								</Text>
							</View>
						) : null}
					</View>

					{activeStep.type === "text" ? (
						<>
							<View
								style={[
									styles.textSurface,
									{
										backgroundColor: noteSurfaceColor,
										borderColor: noteBorderColor,
									},
								]}
							>
								<TextInput
									value={draft.note || ""}
									onChangeText={handleNoteChange}
									placeholder={MAP_COMMIT_TRIAGE_COPY.NOTE_PLACEHOLDER}
									placeholderTextColor={mutedColor}
									style={[styles.textInput, { color: titleColor }]}
									multiline
									maxLength={240}
									textAlignVertical="top"
								/>
							</View>
							<View style={styles.actionsRow}>
								<Pressable
									onPress={handleSkip}
									style={[
										styles.secondaryButton,
										{ backgroundColor: secondarySurfaceColor },
									]}
								>
									<Text
										style={[
											styles.secondaryButtonText,
											{ color: titleColor },
										]}
									>
										{MAP_COMMIT_TRIAGE_COPY.SKIP}
									</Text>
								</Pressable>
								<Pressable
									onPress={advance}
									style={[
										styles.primaryButton,
										{ backgroundColor: accentColor },
									]}
								>
									<Text style={styles.primaryButtonText}>
										{MAP_COMMIT_TRIAGE_COPY.CONTINUE}
									</Text>
								</Pressable>
							</View>
						</>
					) : (
						<>
							<View style={styles.optionsGrid}>
								{activeStep.options.map((option) => {
									const selectionState = buildCommitTriageSelectionState(
										activeStep,
										draft,
										option,
									);
									const widthStyle = getCommitTriageOptionWidthStyle(
										activeStep,
										option,
										activeStep.options.length,
									);
									const isCompact = widthStyle === "third";
									const iconName = getTriageOptionIcon(activeStep, option);

									return (
										<Pressable
											key={`${activeStep.id}:${String(option.value)}`}
											onPress={() => handleSelectOption(option.value)}
											style={[
												styles.optionCard,
												widthStyle === "full"
													? styles.optionSpanFull
													: widthStyle === "third"
														? styles.optionSpanThird
														: styles.optionSpanHalf,
												{
													backgroundColor: selectionState
														? optionSelectedSurfaceColor
														: optionSurfaceColor,
													borderColor: selectionState
														? optionSelectedBorderColor
														: "transparent",
												},
											]}
										>
											<View
												style={[
													styles.optionContent,
													isCompact ? styles.optionContentCompact : null,
												]}
											>
												<View
													style={[
														styles.optionIconBubble,
														isCompact ? styles.optionIconBubbleCompact : null,
														{
															backgroundColor: selectionState
																? optionSelectedSurfaceColor
																: "transparent",
														},
													]}
												>
													<Ionicons
														name={iconName}
														size={16}
														color={selectionState ? optionSelectedBorderColor : mutedColor}
													/>
												</View>
												<Text
													numberOfLines={isCompact ? 1 : 2}
													style={[
														styles.optionLabel,
														isCompact ? styles.optionLabelCompact : null,
														{
															color: selectionState
																? optionSelectedBorderColor
																: titleColor,
														},
													]}
												>
													{option.label}
												</Text>
											</View>
										</Pressable>
									);
								})}
							</View>

							{activeStep.id === "chiefComplaint" && !showExtendedComplaints ? (
								<Pressable
									onPress={() => setShowExtendedComplaints(true)}
									style={[
										styles.showMoreButton,
										{ borderColor: `${accentColor}40` },
									]}
								>
									<Ionicons name="add-circle-outline" size={14} color={accentColor} />
									<Text style={[styles.showMoreText, { color: accentColor }]}>
										{MAP_COMMIT_TRIAGE_COPY.MORE_SYMPTOMS}
									</Text>
								</Pressable>
							) : null}

							<View style={styles.actionsRow}>
								<Pressable
									onPress={handleSkip}
									style={[
										styles.secondaryButton,
										{
											backgroundColor: secondarySurfaceColor,
											flex: 0,
											minWidth: 136,
											alignSelf: "center",
										},
									]}
								>
									<Text
										style={[
											styles.secondaryButtonText,
											{ color: titleColor },
										]}
									>
										{MAP_COMMIT_TRIAGE_COPY.SKIP}
									</Text>
								</Pressable>
							</View>
						</>
					)}
				</View>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
