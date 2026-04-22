import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../../constants/colors";
import { database } from "../../../database";
import { triageService } from "../../../services/triageService";
import { emergencyRequestsService } from "../../../services/emergencyRequestsService";
import { triageCopilotService } from "../../../services/triageCopilotService";
import {
	buildLegacyTriageSteps,
	COMPLAINT_SIGNAL_MAP,
	getTriageOptionIcon,
	hasMeaningfulTriageDraftData,
	isCriticalTriageDraft,
	normalizeTriageDraft,
	shouldTriageOptionSpanFullWidth,
	triageStepAnswered,
} from "./triageFlow.shared";

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
	const [draft, setDraft] = useState(() => normalizeTriageDraft(initialDraft));
	const [stepIndex, setStepIndex] = useState(0);
	const [showExtendedComplaints, setShowExtendedComplaints] = useState(false);
	const [, setPersisting] = useState(false);
	const [, setAiLoading] = useState(false);
	const [aiPrompt, setAiPrompt] = useState(null);
	const [, setAiSource] = useState(null);
	const [, setAiModel] = useState(null);
	const persistTimerRef = useRef(null);
	const draftStorageTimerRef = useRef(null);
	const aiRequestRef = useRef(null);
	const localDraftHashRef = useRef("");
	const persistHashRef = useRef("");
	const stepFadeAnim = useRef(new Animated.Value(1)).current;
	const progressAnim = useRef(new Animated.Value(0)).current;

	const critical = useMemo(() => isCriticalTriageDraft(draft), [draft]);
	const steps = useMemo(
		() => buildLegacyTriageSteps(phase, draft, showExtendedComplaints),
		[phase, draft, showExtendedComplaints]
	);
	const safeStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
	const activeStep = steps[safeStepIndex] || null;
	const answeredCount = useMemo(
		() => steps.filter((step) => triageStepAnswered(step, draft)).length,
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
			let nextDraft = normalizeTriageDraft(initialDraft);
			if (draftStorageKey) {
				try {
					const storedRaw = await database.readRaw(draftStorageKey);
					if (!cancelled && storedRaw) {
						const storedDraft = normalizeTriageDraft(storedRaw);
						if (hasMeaningfulTriageDraftData(storedDraft)) {
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
			database.writeRaw(draftStorageKey, normalizeTriageDraft(draft)).catch(
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
			if (step.type !== "single") return;
			if (safeStepIndex < steps.length - 1) {
				setTimeout(() => moveStep(1), 90);
				return;
			}
			setTimeout(() => onClose?.(), 120);
		},
		[safeStepIndex, steps.length, moveStep, onClose]
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
	const cardColor = isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.88)";
	const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
	const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
	const phaseAccent = phase === "prebooking" ? COLORS.emergency : COLORS.brandPrimary;
	const promptCopy = aiPrompt || activeStep.prompt;
	const progressLabel = `Step ${safeStepIndex + 1} of ${steps.length}`;
	const isLastStep = safeStepIndex >= steps.length - 1;
	const isAnswered = triageStepAnswered(activeStep, draft);
	const primaryActionLabel = isLastStep ? "Done" : isAnswered ? "Continue" : "Skip for now";
	const backActionLabel = safeStepIndex > 0 ? "Go back" : "Close";
	const progressWidth = progressAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0%", "100%"],
	});

	const handleBackAction = () => {
		if (safeStepIndex > 0) {
			moveStep(-1);
			return;
		}
		onClose?.();
	};

	const handlePrimaryAction = () => {
		if (isLastStep) {
			onClose?.();
			return;
		}
		moveStep(1);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
			<SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
				<View style={styles.header}>
					<Pressable onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={20} color={textColor} />
					</Pressable>
					<View style={styles.headerCenter}>
						<Text style={[styles.headerTitle, { color: textColor }]}>Tell us what’s happening</Text>
						<Text style={[styles.headerSub, { color: mutedColor }]}>We’ll get you the right help</Text>
					</View>
					<View style={styles.stepCounterWrap}>
						<Text style={[styles.stepCounterText, { color: mutedColor }]}>{progressLabel}</Text>
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
									? ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.015)"]
									: ["rgba(255,255,255,0.72)", "rgba(248,250,252,0.88)", "rgba(255,255,255,0.76)"]
							}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={[styles.questionShell, { backgroundColor: cardColor }]}
						>


							{critical ? (
								<View style={[styles.criticalPanel, { backgroundColor: `${COLORS.emergency}10` }]}>
									<View style={[styles.criticalIconWrap, { backgroundColor: `${COLORS.emergency}1A` }]}>
										<Ionicons name="warning-outline" size={20} color={COLORS.emergency} />
									</View>
									<View style={styles.criticalCopyWrap}>
										<Text style={[styles.criticalTitle, { color: textColor }]}>This sounds critical.</Text>
										<Text style={[styles.helperText, { color: mutedColor }]}>Stay reachable and keep the area clear for responders while you finish these quick details.</Text>
									</View>
								</View>
							) : null}

							<Text style={[styles.questionText, { color: textColor }]}>{promptCopy}</Text>
							<View style={styles.optionsGrid}>
								{activeStep.options.map((option) => {
									const selected =
										activeStep.type === "multi"
											? Array.isArray(draft?.[activeStep.field]) &&
												draft[activeStep.field].includes(option.value)
											: draft?.[activeStep.field] === option.value;
									const spanFull = shouldTriageOptionSpanFullWidth(
										activeStep,
										option,
										activeStep.options.length,
									);
									const gridTone = selected
										? `${phaseAccent}24`
										: isDarkMode
											? "rgba(255,255,255,0.07)"
											: "rgba(255,255,255,0.72)";
									const iconName = getTriageOptionIcon(activeStep, option);
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
									<Text style={[styles.showMoreText, { color: phaseAccent }]}>More symptoms</Text>
								</Pressable>
							) : null}
						</LinearGradient>
					</Animated.View>
				</ScrollView>

				<View style={styles.footerBar}>
					<Pressable
						onPress={handleBackAction}
						style={[
							styles.footerSecondaryButton,
							{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" },
						]}
					>
						<Text style={[styles.footerSecondaryText, { color: textColor }]}>{backActionLabel}</Text>
					</Pressable>
					<Pressable
						onPress={handlePrimaryAction}
						style={[styles.footerPrimaryButton, { backgroundColor: phaseAccent }]}
					>
						<Text style={styles.footerPrimaryText}>{primaryActionLabel}</Text>
					</Pressable>
				</View>
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
		paddingHorizontal: 10,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "900",
		textAlign: "center",
	},
	headerSub: {
		fontSize: 12,
		marginTop: 3,
	},
	stepCounterWrap: {
		minWidth: 72,
		alignItems: "flex-end",
	},
	stepCounterText: {
		fontSize: 12,
		fontWeight: "700",
	},
	progressTrack: {
		height: 5,
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
		borderRadius: 28,
		paddingHorizontal: 16,
		paddingVertical: 18,
		overflow: "hidden",
		position: "relative",
		marginHorizontal: 4,
		minHeight: 0,
	},
	questionScroll: {
		flex: 1,
		marginTop: 8,
	},
	questionScrollContent: {
		paddingBottom: 28,
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
	criticalPanel: {
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 18,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		marginBottom: 14,
	},
	criticalIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	criticalCopyWrap: {
		flex: 1,
	},
	criticalTitle: {
		fontSize: 22,
		fontWeight: "900",
		lineHeight: 28,
	},
	questionText: {
		fontSize: 27,
		fontWeight: "900",
		lineHeight: 34,
		marginTop: 4,
	},
	helperText: {
		marginTop: 10,
		fontSize: 15,
		lineHeight: 22,
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
		borderRadius: 999,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
	},
	showMoreText: {
		fontSize: 13,
		fontWeight: "700",
		marginLeft: 6,
	},
	footerBar: {
		flexDirection: "row",
		gap: 10,
		paddingTop: 8,
		paddingBottom: 12,
	},
	footerSecondaryButton: {
		flex: 1,
		minHeight: 50,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
	footerSecondaryText: {
		fontSize: 14,
		fontWeight: "800",
	},
	footerPrimaryButton: {
		flex: 1.2,
		minHeight: 50,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
	footerPrimaryText: {
		fontSize: 14,
		fontWeight: "900",
		color: "#FFFFFF",
	},
});

export default TriageIntakeModal;
