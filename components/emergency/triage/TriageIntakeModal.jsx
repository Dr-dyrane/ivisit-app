import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Easing,
	Modal,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../constants/colors";
import { triageService } from "../../../services/triageService";
import { emergencyRequestsService } from "../../../services/emergencyRequestsService";
import { triageCopilotService } from "../../../services/triageCopilotService";

const PRIMARY_COMPLAINTS = [
	{ label: "Chest pain", value: "chest_pain" },
	{ label: "Breathing trouble", value: "breathing_difficulty" },
	{ label: "Severe bleeding", value: "heavy_bleeding" },
	{ label: "Stroke signs", value: "stroke_signs" },
	{ label: "Injury or fall", value: "injury_fall" },
	{ label: "High fever", value: "high_fever" },
];

const EXTENDED_COMPLAINTS = [
	{ label: "Severe headache", value: "severe_headache" },
	{ label: "Abdominal pain", value: "abdominal_pain" },
	{ label: "Allergic reaction", value: "allergic_reaction" },
	{ label: "Pregnancy concern", value: "pregnancy_concern" },
	{ label: "Mental health crisis", value: "mental_health_crisis" },
	{ label: "Other symptoms", value: "other_symptoms" },
];

const START_TIME_OPTIONS = [
	{ label: "Just now", value: "just_now" },
	{ label: "Under 30 min", value: "under_30m" },
	{ label: "1-3 hours", value: "1_3h" },
	{ label: "Today", value: "today" },
	{ label: "Over 1 day", value: "over_1d" },
];

const YES_NO_OPTIONS = [
	{ label: "Yes", value: true },
	{ label: "No", value: false },
];

const ACCESS_OPTIONS = [
	{ label: "Gate code needed", value: "gate_code" },
	{ label: "Stairs only", value: "stairs_only" },
	{ label: "Elevator available", value: "elevator" },
	{ label: "Hard to find entrance", value: "complex_entry" },
	{ label: "Pets on site", value: "pets_on_site" },
];

const TREND_OPTIONS = [
	{ label: "Getting worse", value: "worsening" },
	{ label: "No change", value: "unchanged" },
	{ label: "Improving", value: "improving" },
	{ label: "Comes and goes", value: "intermittent" },
];

const SIMPLE_STATUS_OPTIONS = [
	{ label: "None", value: "none" },
	{ label: "Known", value: "known" },
	{ label: "Not sure", value: "unknown" },
];

const CAREGIVER_OPTIONS = [
	{ label: "With me now", value: "with_patient" },
	{ label: "On the way", value: "en_route" },
	{ label: "No caregiver", value: "none" },
];

const FACILITY_OPTIONS = [
	{ label: "Closest first", value: "closest" },
	{ label: "Specialist first", value: "specialist" },
	{ label: "Insurance network", value: "insurance_network" },
	{ label: "No preference", value: "none" },
];

const COMPLAINT_SIGNAL_MAP = {
	chest_pain: { chestPain: true },
	breathing_difficulty: { breathingDifficulty: true },
	heavy_bleeding: { heavyBleeding: true },
};

const normalizeDraft = (value) => {
	if (!value || typeof value !== "object") {
		return {
			accessNotes: [],
		};
	}
	return {
		...value,
		accessNotes: Array.isArray(value.accessNotes) ? value.accessNotes : [],
	};
};

const stepAnswered = (step, draft) => {
	const value = draft?.[step.field];
	if (step.type === "multi") return Array.isArray(value) && value.length > 0;
	return value !== undefined && value !== null && String(value).length > 0;
};

const isCriticalDraft = (draft) => {
	if (!draft || typeof draft !== "object") return false;
	if (draft.unconscious === true) return true;
	if (draft.heavyBleeding === true) return true;
	if (draft.breathingDifficulty === true) return true;
	if (draft.chestPain === true) return true;
	const pain = Number(draft.painScale);
	return Number.isFinite(pain) && pain >= 9;
};

const hasMeaningfulDraftData = (draft) => {
	if (!draft || typeof draft !== "object") return false;
	return Object.entries(draft).some(([key, value]) => {
		if (key === "accessNotes") return Array.isArray(value) && value.length > 0;
		if (value === null || value === undefined) return false;
		if (typeof value === "string") return value.trim().length > 0;
		return true;
	});
};

const getOptionIcon = (step, option) => {
	const field = String(step?.field || "");
	const label = String(option?.label || "").toLowerCase();
	const value = option?.value;

	if (field === "chiefComplaint") {
		if (String(value) === "chest_pain") return "heart-half-outline";
		if (String(value) === "breathing_difficulty") return "fitness-outline";
		if (String(value) === "heavy_bleeding") return "water-outline";
		return "medkit-outline";
	}
	if (field === "symptomStartTime") return "time-outline";
	if (field === "painScale") return Number(value) >= 7 ? "flame-outline" : "pulse-outline";
	if (field === "breathingDifficulty" || field === "unconscious" || field === "heavyBleeding") {
		if (value === true || label === "yes") return "checkmark-circle-outline";
		return "close-circle-outline";
	}
	if (field === "symptomTrend") return "trending-up-outline";
	if (field === "facilityPreference") return "business-outline";
	return "ellipse-outline";
};

const shouldSpanFullWidth = (step, option, optionCount) => {
	if (step?.field === "painScale") return false;
	if (step?.field === "accessNotes") return true;
	if (optionCount <= 2) return true;
	return String(option?.label || "").length > 16;
};

const buildSteps = (phase, draft, showExtendedComplaints) => {
	const complaintOptions = showExtendedComplaints
		? [...PRIMARY_COMPLAINTS, ...EXTENDED_COMPLAINTS]
		: PRIMARY_COMPLAINTS;

	const prebooking = [
		{
			id: "chiefComplaint",
			field: "chiefComplaint",
			type: "single",
			prompt: "What feels most wrong right now?",
			options: complaintOptions,
		},
		{
			id: "symptomStartTime",
			field: "symptomStartTime",
			type: "single",
			prompt: "When did this start?",
			options: START_TIME_OPTIONS,
		},
		{
			id: "breathingDifficulty",
			field: "breathingDifficulty",
			type: "single",
			prompt: "Any breathing difficulty?",
			options: YES_NO_OPTIONS,
		},
		{
			id: "unconscious",
			field: "unconscious",
			type: "single",
			prompt: "Any loss of consciousness?",
			options: YES_NO_OPTIONS,
		},
		{
			id: "heavyBleeding",
			field: "heavyBleeding",
			type: "single",
			prompt: "Is there heavy bleeding?",
			options: YES_NO_OPTIONS,
		},
		{
			id: "accessNotes",
			field: "accessNotes",
			type: "multi",
			prompt: "Anything responders should know to get in fast?",
			options: ACCESS_OPTIONS,
		},
	];

	const waiting = [
		{
			id: "painScale",
			field: "painScale",
			type: "single",
			prompt: "Pain level right now?",
			options: Array.from({ length: 11 }, (_, n) => ({ label: String(n), value: n })),
		},
		{
			id: "symptomTrend",
			field: "symptomTrend",
			type: "single",
			prompt: "How is it changing?",
			options: TREND_OPTIONS,
		},
		{
			id: "allergyStatus",
			field: "allergyStatus",
			type: "single",
			prompt: "Allergies?",
			options: SIMPLE_STATUS_OPTIONS,
		},
		{
			id: "medicationStatus",
			field: "medicationStatus",
			type: "single",
			prompt: "Current meds?",
			options: SIMPLE_STATUS_OPTIONS,
		},
		{
			id: "historyStatus",
			field: "historyStatus",
			type: "single",
			prompt: "Relevant history?",
			options: SIMPLE_STATUS_OPTIONS,
		},
		{
			id: "caregiverSupport",
			field: "caregiverSupport",
			type: "single",
			prompt: "Caregiver support?",
			options: CAREGIVER_OPTIONS,
		},
		{
			id: "facilityPreference",
			field: "facilityPreference",
			type: "single",
			prompt: "Facility preference?",
			options: FACILITY_OPTIONS,
		},
	];

	if (phase === "prebooking") return prebooking;
	return draft?.chiefComplaint ? waiting : [prebooking[0], ...waiting];
};

const TriageIntakeModal = ({
	visible = false,
	onClose,
	phase = "prebooking",
	requestId = null,
	requestContext = null,
	hospitals = [],
	selectedHospitalId = null,
	initialDraft = null,
	onDraftChange,
	isDarkMode = false,
}) => {
	const [draft, setDraft] = useState(() => normalizeDraft(initialDraft));
	const [stepIndex, setStepIndex] = useState(0);
	const [showExtendedComplaints, setShowExtendedComplaints] = useState(false);
	const [persisting, setPersisting] = useState(false);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiPrompt, setAiPrompt] = useState(null);
	const [aiSource, setAiSource] = useState(null);
	const [aiModel, setAiModel] = useState(null);
	const persistTimerRef = useRef(null);
	const draftStorageTimerRef = useRef(null);
	const aiRequestRef = useRef(null);
	const localDraftHashRef = useRef("");
	const persistHashRef = useRef("");
	const stepFadeAnim = useRef(new Animated.Value(1)).current;
	const progressAnim = useRef(new Animated.Value(0)).current;

	const critical = useMemo(() => isCriticalDraft(draft), [draft]);
	const steps = useMemo(
		() => buildSteps(phase, draft, showExtendedComplaints),
		[phase, draft, showExtendedComplaints]
	);
	const safeStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
	const activeStep = steps[safeStepIndex] || null;
	const answeredCount = useMemo(
		() => steps.filter((step) => stepAnswered(step, draft)).length,
		[steps, draft]
	);
	const progressPct = steps.length > 0 ? Math.round((answeredCount / steps.length) * 100) : 100;
	const draftStorageKey = useMemo(
		() => (requestId ? `@ivisit/triage_draft/${String(requestId)}` : null),
		[requestId]
	);

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		const hydrateDraft = async () => {
			let nextDraft = normalizeDraft(initialDraft);
			if (draftStorageKey) {
				try {
					const storedRaw = await AsyncStorage.getItem(draftStorageKey);
					if (!cancelled && storedRaw) {
						const storedDraft = normalizeDraft(JSON.parse(storedRaw));
						if (hasMeaningfulDraftData(storedDraft)) {
							nextDraft = storedDraft;
						}
					}
				} catch (error) {
					if (__DEV__) {
						console.warn("[TriageIntakeModal] Failed to restore local draft:", error);
					}
				}
			}
			if (!cancelled) {
				setDraft(nextDraft);
			}
		};
		void hydrateDraft();
		setStepIndex(0);
		setShowExtendedComplaints(false);
		setAiPrompt(null);
		setAiSource(null);
		setAiModel(null);
		return () => {
			cancelled = true;
		};
	}, [visible, phase, requestId, draftStorageKey]);

	useEffect(() => {
		if (!visible || !draftStorageKey) return;
		if (draftStorageTimerRef.current) clearTimeout(draftStorageTimerRef.current);
		draftStorageTimerRef.current = setTimeout(() => {
			AsyncStorage.setItem(draftStorageKey, JSON.stringify(normalizeDraft(draft))).catch(
				(error) => {
					if (__DEV__) {
						console.warn("[TriageIntakeModal] Failed to persist local draft:", error);
					}
				}
			);
		}, 180);
		return () => clearTimeout(draftStorageTimerRef.current);
	}, [visible, draftStorageKey, draft]);

	useEffect(() => {
		if (!visible) return;
		const hash = JSON.stringify(draft || {});
		if (hash === localDraftHashRef.current) return;
		localDraftHashRef.current = hash;
		if (typeof onDraftChange === "function") onDraftChange(draft);
	}, [visible, draft, onDraftChange]);

	useEffect(() => {
		if (!visible || phase !== "waiting" || !requestId) return;
		const persistHash = JSON.stringify({ requestId, draft, selectedHospitalId });
		if (persistHashRef.current === persistHash) return;
		persistHashRef.current = persistHash;
		if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
		persistTimerRef.current = setTimeout(async () => {
			setPersisting(true);
			try {
				await triageService.collectAndPersist({
					requestId,
					stage: "waiting_lane",
					request: {
						serviceType: requestContext?.serviceType ?? "ambulance",
						specialty: requestContext?.specialty ?? null,
					},
					hospitals: Array.isArray(hospitals) ? hospitals : [],
					selectedHospitalId,
					userCheckin: draft,
					persist: (id, snapshot, options) =>
						emergencyRequestsService.updateTriage(id, snapshot, options),
				});
			} catch (error) {
				console.warn("[TriageIntakeModal] triage persist skipped:", error);
			} finally {
				setPersisting(false);
			}
		}, 700);
		return () => clearTimeout(persistTimerRef.current);
	}, [visible, phase, requestId, draft, requestContext, hospitals, selectedHospitalId]);

	useEffect(() => {
		if (!visible || !activeStep || critical) {
			setAiPrompt(null);
			setAiSource(null);
			setAiModel(null);
			return;
		}
		const aiRequestId = `${phase}:${activeStep.id}:${JSON.stringify(draft)}`;
		aiRequestRef.current = aiRequestId;
		setAiLoading(true);
		void triageCopilotService
			.suggestPrompt({
				phase,
				requestContext,
				draft,
				step: {
					id: activeStep.id,
					field: activeStep.field,
					prompt: activeStep.prompt,
					options: activeStep.options.map((option) => option.label),
				},
			})
			.then((response) => {
				if (aiRequestRef.current !== aiRequestId) return;
				setAiPrompt(typeof response?.prompt === "string" ? response.prompt : null);
				setAiSource(typeof response?.source === "string" ? response.source : null);
				setAiModel(typeof response?.model === "string" ? response.model : null);
				if (response?.source === "anthropic") {
					console.log("[TriageIntakeModal] AI source: anthropic", {
						model: response?.model ?? null,
						phase,
						step: activeStep?.id ?? null,
					});
				}
			})
			.catch(() => {
				if (aiRequestRef.current !== aiRequestId) return;
				setAiPrompt(null);
				setAiSource(null);
				setAiModel(null);
			})
			.finally(() => {
				if (aiRequestRef.current !== aiRequestId) return;
				setAiLoading(false);
			});
	}, [visible, phase, requestContext, draft, activeStep, critical]);

	useEffect(() => {
		if (!visible) return;
		Animated.timing(progressAnim, {
			toValue: progressPct / 100,
			duration: 240,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [visible, progressPct, progressAnim]);

	useEffect(() => {
		if (!visible) return;
		stepFadeAnim.setValue(0.88);
		Animated.timing(stepFadeAnim, {
			toValue: 1,
			duration: 200,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [visible, activeStep?.id, critical, stepFadeAnim]);

	const moveStep = useCallback(
		(delta) => {
			setStepIndex((prev) => Math.max(0, Math.min(prev + delta, Math.max(steps.length - 1, 0))));
		},
		[steps.length]
	);

	const selectOption = useCallback(
		(step, optionValue) => {
			const impliedSignals =
				step.field === "chiefComplaint" ? COMPLAINT_SIGNAL_MAP?.[optionValue] || null : null;
			setDraft((prev) => ({ ...prev, [step.field]: optionValue, ...(impliedSignals || {}) }));
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
			if (step.type === "single" && safeStepIndex < steps.length - 1) {
				setTimeout(() => moveStep(1), 100);
			}
		},
		[safeStepIndex, steps.length, moveStep]
	);

	const toggleMulti = useCallback((step, value) => {
		setDraft((prev) => {
			const current = Array.isArray(prev?.[step.field]) ? prev[step.field] : [];
			const exists = current.includes(value);
			const next = exists ? current.filter((item) => item !== value) : [...current, value];
			return { ...prev, [step.field]: next };
		});
	}, []);

	if (!activeStep) return null;

	const bgColor = isDarkMode ? COLORS.bgDark : COLORS.bgLight;
	const cardColor = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const phaseAccent = phase === "prebooking" ? COLORS.emergency : COLORS.brandPrimary;
	const promptCopy = aiPrompt || activeStep.prompt;
	const aiBadgeLabel = aiLoading
		? "Personalizing..."
		: aiSource === "anthropic"
			? "AI Copilot"
			: "Smart defaults";
	const progressWidth = progressAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0%", "100%"],
	});

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
			<SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
				<View style={styles.header}>
					<Pressable onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={20} color={textColor} />
					</Pressable>
					<View style={styles.headerCenter}>
						<Text style={[styles.headerTitle, { color: textColor }]}>Guided Intake</Text>
						<Text style={[styles.headerSub, { color: mutedColor }]}>
							{phase === "prebooking" ? "Fast routing check" : "Progressive waiting check"}
						</Text>
					</View>
					<View style={[styles.progressRing, { borderColor: phaseAccent }]}>
						<Text style={[styles.progressText, { color: phaseAccent }]}>{progressPct}%</Text>
					</View>
				</View>
				<View
					style={[
						styles.progressTrack,
						{
							backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)",
						},
					]}
				>
					<Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: phaseAccent }]} />
				</View>

				<ScrollView
					style={styles.questionScroll}
					contentContainerStyle={styles.questionScrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Animated.View
						style={[
							styles.stepFrame,
							{
								opacity: stepFadeAnim,
								transform: [
									{
										scale: stepFadeAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [0.985, 1],
										}),
									},
								],
							},
						]}
					>
						<LinearGradient
							colors={
								isDarkMode
									? ["rgba(59,130,246,0.17)", "rgba(124,58,237,0.12)", "rgba(17,24,39,0.28)"]
									: ["rgba(239,68,68,0.10)", "rgba(14,165,233,0.12)", "rgba(255,255,255,0.22)"]
							}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={[styles.questionShell, { backgroundColor: cardColor }]}
						>
							<View
								style={[
									styles.shellOrb,
									styles.shellOrbA,
									{ backgroundColor: isDarkMode ? "rgba(248,113,113,0.15)" : "rgba(248,113,113,0.18)" },
								]}
							/>
							<View
								style={[
									styles.shellOrb,
									styles.shellOrbB,
									{ backgroundColor: isDarkMode ? "rgba(14,165,233,0.14)" : "rgba(14,165,233,0.18)" },
								]}
							/>
							<View style={styles.stepMetaRow}>
								<View style={[styles.stepMetaPill, { backgroundColor: `${phaseAccent}1F` }]}>
									<Text style={[styles.stepMetaPillText, { color: phaseAccent }]}>
										{safeStepIndex + 1} / {steps.length}
									</Text>
								</View>
								<View style={[styles.guidePill, { backgroundColor: `${phaseAccent}16` }]}>
									<Text style={[styles.guidePillText, { color: phaseAccent }]}>
										{activeStep.type === "multi" ? "Tap all that apply" : "Tap one to continue"}
									</Text>
								</View>
							</View>

							{critical ? (
								<View style={styles.criticalPanel}>
									<View style={[styles.criticalIconWrap, { backgroundColor: `${COLORS.emergency}1A` }]}>
										<Ionicons name="warning-outline" size={20} color={COLORS.emergency} />
									</View>
									<Text style={[styles.questionText, { color: textColor }]}>Safety mode active now.</Text>
									<Text style={[styles.helperText, { color: mutedColor }]}>
										Keep airway clear, apply direct pressure for bleeding, and stay reachable for responders.
									</Text>
								</View>
							) : (
								<>
									<Text style={[styles.questionPreamble, { color: mutedColor }]}>iVisit guide</Text>
									<Text style={[styles.questionText, { color: textColor }]}>{promptCopy}</Text>
									<View style={styles.aiMetaRow}>
										<View
											style={[
												styles.aiMetaPill,
												{
													backgroundColor:
														aiSource === "anthropic"
															? `${phaseAccent}24`
															: isDarkMode
																? "rgba(255,255,255,0.08)"
																: "rgba(15,23,42,0.08)",
												},
											]}
										>
											{aiLoading ? <ActivityIndicator size="small" color={phaseAccent} /> : null}
											<Text style={[styles.aiMetaText, { color: aiSource === "anthropic" ? phaseAccent : mutedColor }]}>
												{aiBadgeLabel}
											</Text>
										</View>
										{aiSource === "anthropic" && aiModel ? (
											<Text style={[styles.aiModelText, { color: mutedColor }]} numberOfLines={1}>
												{aiModel}
											</Text>
										) : null}
									</View>
									<View style={styles.optionsGrid}>
										{activeStep.options.map((option) => {
											const selected =
												activeStep.type === "multi"
													? Array.isArray(draft?.[activeStep.field]) &&
														draft[activeStep.field].includes(option.value)
													: draft?.[activeStep.field] === option.value;
											const spanFull = shouldSpanFullWidth(activeStep, option, activeStep.options.length);
											const gridTone = selected
												? `${phaseAccent}24`
												: isDarkMode
													? "rgba(255,255,255,0.07)"
													: "rgba(255,255,255,0.72)";
											const iconName = getOptionIcon(activeStep, option);
											return (
												<Pressable
													key={`${activeStep.id}:${String(option.value)}`}
													onPress={() =>
														activeStep.type === "multi"
															? toggleMulti(activeStep, option.value)
															: selectOption(activeStep, option.value)
													}
													style={[
														styles.optionCard,
														spanFull ? styles.optionSpanFull : styles.optionSpanHalf,
														{
															backgroundColor: gridTone,
															borderColor: selected ? phaseAccent : "transparent",
														},
													]}
												>
													<View style={styles.optionContent}>
														<View
															style={[
																styles.optionIconBubble,
																{ backgroundColor: selected ? `${phaseAccent}24` : "transparent" },
															]}
														>
															<Ionicons
																name={iconName}
																size={16}
																color={selected ? phaseAccent : mutedColor}
															/>
														</View>
														<Text
															style={[
																styles.optionLabel,
																{ color: selected ? phaseAccent : textColor },
															]}
															numberOfLines={2}
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
											style={[styles.showMoreButton, { borderColor: `${phaseAccent}40` }]}
										>
											<Ionicons name="add-circle-outline" size={14} color={phaseAccent} />
											<Text style={[styles.showMoreText, { color: phaseAccent }]}>Show more options</Text>
										</Pressable>
									) : null}
								</>
							)}
						</LinearGradient>
					</Animated.View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable
						onPress={() => moveStep(-1)}
						disabled={safeStepIndex <= 0}
						style={[
							styles.footerButton,
							safeStepIndex <= 0 ? styles.footerButtonDisabled : null,
							{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" },
						]}
					>
						<Text style={[styles.footerActionText, { color: safeStepIndex <= 0 ? mutedColor : textColor }]}>
							Back
						</Text>
					</Pressable>
					<Pressable
						onPress={() => moveStep(1)}
						style={[
							styles.footerButton,
							{
								backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
							},
						]}
					>
						<Text style={[styles.footerActionText, { color: mutedColor }]}>Skip</Text>
					</Pressable>
					<Pressable
						onPress={() => (safeStepIndex >= steps.length - 1 ? onClose?.() : moveStep(1))}
						style={[styles.footerButton, { backgroundColor: phaseAccent }]}
					>
						<Text style={[styles.footerActionText, { color: "#FFFFFF" }]}>
							{safeStepIndex >= steps.length - 1 ? "Done" : "Next"}
						</Text>
					</Pressable>
				</View>
				{persisting ? (
					<View
						style={[
							styles.persistingBadge,
							{
								backgroundColor: isDarkMode ? "rgba(15,23,42,0.70)" : "rgba(255,255,255,0.92)",
								borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
							},
						]}
					>
						<ActivityIndicator size="small" color={phaseAccent} />
						<Text style={[styles.persistingText, { color: mutedColor }]}>Saving in background...</Text>
					</View>
				) : null}
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		paddingHorizontal: 16,
	},
	header: {
		paddingTop: 8,
		paddingBottom: 6,
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 8,
	},
	closeButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
	},
	headerCenter: {
		flex: 1,
		alignItems: "center",
	},
	headerTitle: {
		fontSize: 19,
		fontWeight: "900",
	},
	headerSub: {
		fontSize: 12,
		marginTop: 3,
	},
	progressRing: {
		width: 46,
		height: 46,
		borderRadius: 23,
		borderWidth: 3,
		alignItems: "center",
		justifyContent: "center",
	},
	progressText: {
		fontSize: 11,
		fontWeight: "900",
		color: COLORS.brandPrimary,
	},
	progressTrack: {
		height: 7,
		borderRadius: 999,
		overflow: "hidden",
		marginHorizontal: 16,
	},
	progressFill: {
		height: "100%",
		borderRadius: 999,
	},
	stepFrame: {
		marginTop: 10,
	},
	questionShell: {
		borderRadius: 24,
		padding: 18,
		overflow: "hidden",
		position: "relative",
		marginHorizontal: 8,
	},
	questionScroll: {
		flex: 1,
		marginTop: 8,
	},
	questionScrollContent: {
		paddingBottom: 12,
	},
	shellOrb: {
		position: "absolute",
		borderRadius: 999,
	},
	shellOrbA: {
		width: 120,
		height: 120,
		top: -42,
		right: -22,
	},
	shellOrbB: {
		width: 88,
		height: 88,
		bottom: -30,
		left: -22,
	},
	stepMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	stepMetaPill: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	stepMetaPillText: {
		fontSize: 11,
		fontWeight: "900",
	},
	guidePill: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	guidePillText: {
		fontSize: 11,
		fontWeight: "700",
	},
	criticalPanel: {
		paddingVertical: 6,
	},
	criticalIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	questionPreamble: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	questionText: {
		fontSize: 29,
		fontWeight: "900",
		lineHeight: 35,
		marginTop: 8,
	},
	helperText: {
		marginTop: 10,
		fontSize: 15,
		lineHeight: 22,
	},
	aiMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 14,
	},
	aiMetaPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		flexDirection: "row",
		alignItems: "center",
	},
	aiMetaText: {
		fontSize: 12,
		fontWeight: "700",
		marginLeft: 6,
	},
	aiModelText: {
		fontSize: 11,
		fontWeight: "600",
		flex: 1,
		textAlign: "right",
		marginLeft: 10,
	},
	optionsGrid: {
		marginTop: 16,
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		gap: 10,
	},
	optionCard: {
		paddingHorizontal: 14,
		paddingVertical: 13,
		borderRadius: 16,
		borderWidth: 1,
	},
	optionSpanHalf: {
		width: "48%",
	},
	optionSpanFull: {
		width: "100%",
	},
	optionContent: {
		flexDirection: "row",
		alignItems: "center",
	},
	optionIconBubble: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	optionLabel: {
		fontSize: 15,
		fontWeight: "800",
		flex: 1,
	},
	showMoreButton: {
		marginTop: 14,
		alignSelf: "flex-start",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	showMoreText: {
		fontSize: 13,
		fontWeight: "700",
		marginLeft: 6,
	},
	footer: {
		paddingTop: 10,
		paddingBottom: 8,
		flexDirection: "row",
		gap: 8,
		marginHorizontal: 8,
	},
	footerButton: {
		flex: 1,
		minHeight: 42,
		borderRadius: 13,
		alignItems: "center",
		justifyContent: "center",
	},
	footerButtonDisabled: {
		opacity: 0.45,
	},
	footerActionText: {
		fontSize: 14,
		fontWeight: "800",
	},
	persistingBadge: {
		position: "absolute",
		bottom: 12,
		alignSelf: "center",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		borderWidth: 1,
	},
	persistingText: {
		marginLeft: 8,
		fontSize: 12,
		fontWeight: "600",
	},
});

export default TriageIntakeModal;
