import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
// PULLBACK NOTE: Phase 5d — raw trip reads moved off EmergencyContext
// OLD: useEmergency() for activeAmbulanceTrip/activeBedBooking/pendingApproval/patch*
// NEW: direct useEmergencyTripStore() selectors — context no longer re-broadcasts raw trips
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { useEmergencyTripStore } from "../../../../stores/emergencyTripStore";
import { useEmergencyContacts } from "../../../../hooks/emergency/useEmergencyContacts";
import { useMedicalProfile } from "../../../../hooks/user/useMedicalProfile";
import { emergencyRequestsService } from "../../../../services/emergencyRequestsService";
import { triageCopilotService } from "../../../../services/triageCopilotService";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import { MAP_COMMIT_TRIAGE_COPY } from "./mapCommitTriage.content";
import {
	applyCommitTriageSelection,
	buildCommitTriageProgressMeta,
	buildCommitTriageSnapshot,
	buildMapCommitTriageSteps,
	getFirstOpenCommitTriageStepId,
	hasMeaningfulTriageDraftData,
	isCriticalTriageDraft,
	normalizeCommitTriageDraft,
	sanitizeCommitTriageNote,
} from "./mapCommitTriage.helpers";

export default function useMapCommitTriageController({
	hospital,
	transport,
	payload = null,
	stageMetrics = null,
	onBack,
	onConfirm,
}) {
	const {
		setCommitFlow,
		hospitals,
		selectedSpecialty,
	} = useEmergency();
	// PULLBACK NOTE: Phase 5d — raw trip objects sourced from Zustand store directly
	// OLD: destructured from useEmergency() — caused context re-render on every trip update
	// NEW: surgical store selectors — only re-renders when specific field changes
	const activeAmbulanceTrip = useEmergencyTripStore((s) => s.activeAmbulanceTrip);
	const activeBedBooking = useEmergencyTripStore((s) => s.activeBedBooking);
	const pendingApproval = useEmergencyTripStore((s) => s.pendingApproval);
	const patchActiveAmbulanceTrip = useEmergencyTripStore((s) => s.patchActiveAmbulanceTrip);
	const patchActiveBedBooking = useEmergencyTripStore((s) => s.patchActiveBedBooking);
	const patchPendingApproval = useEmergencyTripStore((s) => s.patchPendingApproval);
	const { contacts: emergencyContacts } = useEmergencyContacts();
	const { profile: medicalProfile } = useMedicalProfile();

	const activeRequestId =
		payload?.requestId ||
		activeAmbulanceTrip?.requestId ||
		activeAmbulanceTrip?.id ||
		activeBedBooking?.requestId ||
		activeBedBooking?.id ||
		pendingApproval?.requestId ||
		pendingApproval?.id ||
		null;
	const triageSessionKey = String(
		activeRequestId || `${payload?.careIntent || "draft"}:${hospital?.id || "hospital"}`,
	);
	const initialDraft = useMemo(
		() =>
			normalizeCommitTriageDraft(
				payload?.triageDraft ||
					payload?.triageSnapshot?.signals?.userCheckin ||
					activeAmbulanceTrip?.triage?.signals?.userCheckin ||
					activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin ||
					activeAmbulanceTrip?.triageCheckin ||
					activeBedBooking?.triage?.signals?.userCheckin ||
					activeBedBooking?.triageSnapshot?.signals?.userCheckin ||
					activeBedBooking?.triageCheckin ||
					pendingApproval?.triage?.signals?.userCheckin ||
					pendingApproval?.triageSnapshot?.signals?.userCheckin ||
					pendingApproval?.initiatedData?.triageCheckin ||
					null,
			),
		[
			activeAmbulanceTrip?.triage?.signals?.userCheckin,
			activeAmbulanceTrip?.triageCheckin,
			activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin,
			activeBedBooking?.triage?.signals?.userCheckin,
			activeBedBooking?.triageCheckin,
			activeBedBooking?.triageSnapshot?.signals?.userCheckin,
			payload?.triageDraft,
			payload?.triageSnapshot?.signals?.userCheckin,
			pendingApproval?.initiatedData?.triageCheckin,
			pendingApproval?.triage?.signals?.userCheckin,
			pendingApproval?.triageSnapshot?.signals?.userCheckin,
		],
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
		payload?.activeStep || getFirstOpenCommitTriageStepId(steps, initialDraft),
	);
	const triageSessionKeyRef = useRef(triageSessionKey);
	const liveSaveRef = useRef({ signature: null, timer: null });
	const advanceTimerRef = useRef(null);
	const triagePatchSignatureRef = useRef(null);
	const orbPulse = useRef(new Animated.Value(0)).current;
	const [copilotPrompt, setCopilotPrompt] = useState(null);

	useEffect(() => {
		if (triageSessionKeyRef.current === triageSessionKey) return;
		triageSessionKeyRef.current = triageSessionKey;
		triagePatchSignatureRef.current = null;
		setDraft(initialDraft);
		setActiveStepId(
			payload?.activeStep || getFirstOpenCommitTriageStepId(steps, initialDraft),
		);
	}, [initialDraft, payload?.activeStep, steps, triageSessionKey]);

	useEffect(() => {
		setShowExtendedComplaints(Boolean(payload?.showExtendedComplaints));
	}, [payload?.showExtendedComplaints]);

	useEffect(() => {
		if (!payload?.activeStep) return;
		setActiveStepId(payload.activeStep);
	}, [payload?.activeStep]);

	useEffect(() => {
		if (!steps.some((step) => step.id === activeStepId)) {
			setActiveStepId(getFirstOpenCommitTriageStepId(steps, draft));
		}
	}, [activeStepId, draft, steps]);

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(orbPulse, {
					toValue: 1,
					duration: 1700,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(orbPulse, {
					toValue: 0,
					duration: 1700,
					easing: Easing.inOut(Easing.cubic),
					useNativeDriver: true,
				}),
			]),
		);
		animation.start();
		return () => animation.stop();
	}, [orbPulse]);

	useEffect(
		() => () => {
			if (advanceTimerRef.current) {
				clearTimeout(advanceTimerRef.current);
			}
			if (liveSaveRef.current.timer) {
				clearTimeout(liveSaveRef.current.timer);
			}
		},
		[],
	);

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
	const triageProgressMeta = useMemo(
		() => buildCommitTriageProgressMeta(steps, draft, activeStep?.id || null),
		[activeStep?.id, draft, steps],
	);
	const liveTriageSnapshot = useMemo(() => {
		if (!triageSnapshot) return null;
		return {
			...triageSnapshot,
			progress: triageProgressMeta,
			engine: {
				...(triageSnapshot.engine || {}),
				deterministicStepCount: triageProgressMeta.totalSteps,
				copilotEnabled: triageCopilotService.isEnabled(),
			},
		};
	}, [triageProgressMeta, triageSnapshot]);

	useEffect(() => {
		setCopilotPrompt(null);
		if (!activeStep || !triageCopilotService.isEnabled()) return undefined;
		let cancelled = false;
		triageCopilotService
			.suggestPrompt({
				stage: "map_commit_triage",
				step: {
					id: activeStep.id,
					field: activeStep.field,
					type: activeStep.type,
					prompt: activeStep.prompt,
					aiIntent: activeStep.aiIntent || null,
					options: Array.isArray(activeStep.options)
						? activeStep.options.map((option) => option?.label).filter(Boolean)
						: [],
				},
				context: {
					careIntent: payload?.careIntent || null,
					hospitalName,
					selectionLabel,
				},
			})
			.then((result) => {
				if (!cancelled && result?.prompt) {
					setCopilotPrompt(result.prompt);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [
		activeStep?.aiIntent,
		activeStep?.field,
		activeStep?.id,
		activeStep?.prompt,
		activeStep?.type,
		hospitalName,
		payload?.careIntent,
		selectionLabel,
	]);

	useEffect(() => {
		const hasDraft = hasMeaningfulTriageDraftData(draft);
		if (!hasDraft && !liveTriageSnapshot) {
			return;
		}

		const triageUpdates = {
			triage: liveTriageSnapshot,
			triageSnapshot: liveTriageSnapshot,
			triageCheckin: hasDraft ? draft : null,
			triageProgress: triageProgressMeta,
		};

		const matchesActiveRequest = (request) =>
			request &&
			(!activeRequestId ||
				String(activeRequestId) === String(request.requestId) ||
				String(activeRequestId) === String(request.id));
		const patchSignature = JSON.stringify({
			requestId: activeRequestId || null,
			triageCheckin: triageUpdates.triageCheckin || null,
			triageProgress: triageProgressMeta,
			triageSnapshot: liveTriageSnapshot,
		});

		if (triagePatchSignatureRef.current === patchSignature) {
			return;
		}

		let patched = false;

		if (
			typeof patchActiveAmbulanceTrip === "function" &&
			matchesActiveRequest(activeAmbulanceTrip)
		) {
			patchActiveAmbulanceTrip(triageUpdates);
			patched = true;
		}

		if (
			typeof patchActiveBedBooking === "function" &&
			matchesActiveRequest(activeBedBooking)
		) {
			patchActiveBedBooking(triageUpdates);
			patched = true;
		}

		if (
			typeof patchPendingApproval === "function" &&
			matchesActiveRequest(pendingApproval)
		) {
			patchPendingApproval(triageUpdates);
			patched = true;
		}

		if (patched) {
			triagePatchSignatureRef.current = patchSignature;
		}
	}, [
		activeRequestId,
		activeAmbulanceTrip,
		activeBedBooking,
		draft,
		liveTriageSnapshot,
		patchActiveAmbulanceTrip,
		patchActiveBedBooking,
		patchPendingApproval,
		pendingApproval,
		triageProgressMeta,
	]);

	useEffect(() => {
		if (!activeRequestId || !liveTriageSnapshot) return undefined;
		const signature = JSON.stringify({
			requestId: activeRequestId,
			progress: liveTriageSnapshot.progress,
			userCheckin: liveTriageSnapshot.signals?.userCheckin || null,
		});
		if (liveSaveRef.current.signature === signature) return undefined;

		if (activeStep?.type !== "text") {
			liveSaveRef.current.signature = signature;
			emergencyRequestsService
				.updateTriage(activeRequestId, liveTriageSnapshot, {
					reason: "map_triage_live_update",
				})
				.catch(() => undefined);
			return undefined;
		}

		if (liveSaveRef.current.timer) {
			clearTimeout(liveSaveRef.current.timer);
		}
		liveSaveRef.current.timer = setTimeout(() => {
			liveSaveRef.current.signature = signature;
			emergencyRequestsService
				.updateTriage(activeRequestId, liveTriageSnapshot, {
					reason: "map_triage_live_update",
				})
				.catch(() => undefined);
		}, 650);
		return () => {
			if (liveSaveRef.current.timer) {
				clearTimeout(liveSaveRef.current.timer);
			}
		};
	}, [activeRequestId, activeStep?.type, liveTriageSnapshot]);

	const persistCommitFlow = useCallback(
		(nextDraft, nextStepId, nextShowExtendedComplaints) => {
			const nextSnapshot =
				hasMeaningfulTriageDraftData(nextDraft) && nextStepId
					? buildCommitTriageSnapshot({
							triageDraft: nextDraft,
							hospitals,
							hospitalId: hospital?.id || null,
							serviceType:
								payload?.careIntent === "bed" && !transport ? "bed" : "ambulance",
							specialty: selectedSpecialty || null,
							medicalProfile,
							emergencyContacts,
						})
					: null;

			setCommitFlow?.({
				phase: "commit_triage",
				phaseSnapState: MAP_SHEET_SNAP_STATES.EXPANDED,
				hospital,
				hospitalId: hospital?.id || null,
				transport: transport || null,
				draft: payload?.draft || null,
				triageDraft: hasMeaningfulTriageDraftData(nextDraft) ? nextDraft : null,
				triageSnapshot: nextSnapshot
					? {
						...nextSnapshot,
						progress: buildCommitTriageProgressMeta(steps, nextDraft, nextStepId),
					}
					: null,
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
			steps,
			transport,
		],
	);

	useEffect(() => {
		persistCommitFlow(draft, activeStep?.id || null, showExtendedComplaints);
	}, [activeStep?.id, draft, persistCommitFlow, showExtendedComplaints]);

	const buildConfirmPayload = useCallback(
		(overrides = {}) => ({
			draft: payload?.draft || null,
			triageDraft: hasMeaningfulTriageDraftData(draft) ? draft : null,
			triageSnapshot: liveTriageSnapshot,
			careIntent: payload?.careIntent || null,
			requestId: activeRequestId || null,
			roomId: payload?.roomId || null,
			room: payload?.room || null,
			showExtendedComplaints,
			...overrides,
		}),
		[
			activeRequestId,
			draft,
			liveTriageSnapshot,
			payload?.careIntent,
			payload?.draft,
			payload?.room,
			payload?.roomId,
			showExtendedComplaints,
		],
	);

	const advance = useCallback(() => {
		if (activeStepIndex >= steps.length - 1) {
			onConfirm?.(hospital, transport, buildConfirmPayload());
			return;
		}

		setActiveStepId(steps[activeStepIndex + 1]?.id || activeStepId);
	}, [
		activeStepId,
		activeStepIndex,
		buildConfirmPayload,
		hospital,
		onConfirm,
		steps,
		transport,
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

	const handleSkipAll = useCallback(() => {
		onConfirm?.(
			hospital,
			transport,
			buildConfirmPayload({
				triageDraft: null,
				triageSnapshot: null,
				showExtendedComplaints: false,
			}),
		);
	}, [buildConfirmPayload, hospital, onConfirm, transport]);

	const handleSelectOption = useCallback(
		(optionValue) => {
			if (!activeStep) return;
			const nextDraft = applyCommitTriageSelection(activeStep, optionValue, draft);
			setDraft(nextDraft);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
			if (advanceTimerRef.current) {
				clearTimeout(advanceTimerRef.current);
			}
			advanceTimerRef.current = setTimeout(() => {
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
	const handleShowMoreSymptoms = useCallback(() => {
		setShowExtendedComplaints(true);
	}, []);

	const orbSize = Math.round(
		Math.min(88, Math.max(72, (stageMetrics?.height || 852) * 0.108)),
	);
	const orbRadius = Math.round(orbSize / 2);
	const orbIconSize = Math.round(orbSize * 0.42);
	const orbScale = orbPulse.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 1.035],
	});

	return {
		activeStep,
		draft,
		showExtendedComplaints,
		isCritical,
		progressLabel,
		promptText: copilotPrompt || activeStep?.prompt,
		topSlotTitle: activeStep?.headerTitle || MAP_COMMIT_TRIAGE_COPY.HEADER_TITLE,
		topSlotSubtitle: headerSubtitle ? `For ${headerSubtitle}` : "For this request",
		orbSize,
		orbRadius,
		orbIconSize,
		orbScale,
		handleBack,
		handleSkip,
		handleSkipAll,
		handleSelectOption,
		handleNoteChange,
		handleShowMoreSymptoms,
		handleContinue: advance,
	};
}
