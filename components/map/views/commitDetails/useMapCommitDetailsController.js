import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
// PULLBACK NOTE: Phase 5f — setCommitFlow moved off EmergencyContext
// OLD: useEmergency() for setCommitFlow — caused context-wide re-renders on every trip update
// NEW: direct useEmergencyTripStore() selector — scoped re-render only
import { useEmergencyTripStore } from "../../../../stores/emergencyTripStore";
import useCountryDetection from "../../../../hooks/validators/useCountryDetection";
import usePhoneValidation from "../../../../hooks/validators/usePhoneValidation";
import { authService } from "../../../../services/authService";
import { contactInputMemoryService } from "../../../../services/contactInputMemoryService";
import {
	normalizeApiErrorMessage,
	waitForMinimumPending,
} from "../../../../utils/ui/apiInteractionFeedback";
import { MAP_COMMIT_DETAILS_COPY } from "./mapCommitDetails.content";
import {
	getInitialCommitDetailsStep,
	isCommitEmailValid,
	isCommitPhoneValid,
	sanitizeCommitEmail,
	sanitizeCommitOtp,
	sanitizeCommitPhone,
} from "./mapCommitDetails.helpers";

const STEP_ORDER = ["email", "otp", "phone"];
const OTP_EXPIRY_MS = 10 * 60 * 1000;

export default function useMapCommitDetailsController({
	hospital,
	transport,
	payload = null,
	onBack,
	onConfirm,
}) {
	const { user, syncUserData } = useAuth();
	const setCommitFlow = useEmergencyTripStore((s) => s.setCommitFlow);
	const {
		country: phoneCountry,
		setCountry: setPhoneCountry,
		loading: isPhoneCountryLoading,
	} = useCountryDetection();
	const {
		rawInput: phoneRawInput,
		setRawInput: setPhoneRawInput,
		formattedNumber: phoneFormattedNumber,
		isValid: isPhoneResolvedValid,
		e164Format: phoneE164Format,
		setFromE164: setPhoneFromE164,
		clear: clearPhoneField,
	} = usePhoneValidation(phoneCountry);

	const phoneSeedValueRef = useRef(null);
	const otpAutoSubmittedRef = useRef("");
	const autoAdvancedRef = useRef(false);
	const contactMemoryHydratedRef = useRef(false);
	const authReconciliationKeyRef = useRef("");

	const [draft, setDraft] = useState(() => ({
		email: sanitizeCommitEmail(payload?.draft?.email || user?.email),
		otp: "",
		phone: sanitizeCommitPhone(payload?.draft?.phone || user?.phone),
	}));
	const [activeStep, setActiveStep] = useState(
		() => payload?.activeStep || getInitialCommitDetailsStep(user),
	);
	const [stepHistory, setStepHistory] = useState([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [otpExpiresAt, setOtpExpiresAt] = useState(null);
	const [otpCountdownTick, setOtpCountdownTick] = useState(0);

	const persistCommitFlow = useCallback(
		(nextDraft, nextStep) => {
			setCommitFlow?.({
				phase: "commit_details",
				hospital,
				hospitalId: hospital?.id || null,
				transport: transport || null,
				draft: {
					email: nextDraft?.email || "",
					phone: nextDraft?.phone || "",
				},
				activeStep: nextStep || null,
				sourcePhase: payload?.sourcePhase || null,
				sourceSnapState: payload?.sourceSnapState || null,
				sourcePayload: payload?.sourcePayload || null,
			});
		},
		[
			hospital,
			payload?.sourcePayload,
			payload?.sourcePhase,
			payload?.sourceSnapState,
			setCommitFlow,
			transport,
		],
	);

	useEffect(() => {
		const resolvedEmail = sanitizeCommitEmail(user?.email);
		const resolvedPhone = sanitizeCommitPhone(user?.phone);
		setDraft((currentDraft) => ({
			...currentDraft,
			email: resolvedEmail || currentDraft.email,
			phone: resolvedPhone || currentDraft.phone,
		}));
	}, [user?.email, user?.phone]);

	useEffect(() => {
		const resolvedEmail = sanitizeCommitEmail(user?.email);
		if (!resolvedEmail || (activeStep !== "email" && activeStep !== "otp")) {
			authReconciliationKeyRef.current = "";
			return;
		}

		const resolvedPhone = sanitizeCommitPhone(user?.phone);
		const reconciliationKey = `${resolvedEmail}|${resolvedPhone}|${activeStep}`;
		if (authReconciliationKeyRef.current === reconciliationKey) {
			return;
		}
		authReconciliationKeyRef.current = reconciliationKey;

		setErrorMessage("");
		setSuccessMessage("");
		setOtpExpiresAt(null);
		setStepHistory([]);
		setDraft((currentDraft) => ({
			...currentDraft,
			email: resolvedEmail,
			phone: resolvedPhone || currentDraft.phone,
			otp: "",
		}));

		if (isCommitPhoneValid(resolvedPhone)) {
			onConfirm?.(hospital, transport, {
				email: resolvedEmail,
				phone: resolvedPhone,
				careIntent: payload?.careIntent || null,
				roomId: payload?.roomId || null,
			});
			return;
		}

		setActiveStep("phone");
	}, [
		activeStep,
		hospital,
		onConfirm,
		payload?.careIntent,
		payload?.roomId,
		transport,
		user?.email,
		user?.phone,
	]);

	useEffect(() => {
		if (contactMemoryHydratedRef.current) return undefined;

		let cancelled = false;
		contactMemoryHydratedRef.current = true;
		contactInputMemoryService
			.getMemory()
			.then((memory) => {
				if (cancelled) return;
				const rememberedEmail = sanitizeCommitEmail(memory?.lastEmail);
				const rememberedPhone = sanitizeCommitPhone(memory?.lastPhone);
				setDraft((currentDraft) => {
					const nextEmail =
						currentDraft.email ||
						sanitizeCommitEmail(user?.email) ||
						rememberedEmail;
					const nextPhone =
						currentDraft.phone ||
						sanitizeCommitPhone(user?.phone) ||
						rememberedPhone;
					if (
						nextEmail === currentDraft.email &&
						nextPhone === currentDraft.phone
					) {
						return currentDraft;
					}
					return {
						...currentDraft,
						email: nextEmail,
						phone: nextPhone,
					};
				});
			})
			.catch((error) => {
				console.warn(
					"[MapCommitDetails] Failed to hydrate contact memory:",
					error?.message || error,
				);
			});

		return () => {
			cancelled = true;
		};
	}, [user?.email, user?.phone]);

	useEffect(() => {
		if (activeStep !== "phone" || !phoneCountry) return;
		const nextPhoneSeed = sanitizeCommitPhone(draft.phone || user?.phone || "");
		if (phoneSeedValueRef.current === nextPhoneSeed) return;
		phoneSeedValueRef.current = nextPhoneSeed;

		if (!nextPhoneSeed) {
			clearPhoneField();
			return;
		}

		if (nextPhoneSeed.startsWith("+")) {
			setPhoneFromE164(nextPhoneSeed);
			return;
		}

		setPhoneRawInput(nextPhoneSeed);
	}, [
		activeStep,
		draft.phone,
		phoneCountry,
		user?.phone,
		clearPhoneField,
		setPhoneFromE164,
		setPhoneRawInput,
	]);

	const handleBack = useCallback(() => {
		if (stepHistory.length === 0) {
			onBack?.();
			return;
		}
		setStepHistory((history) => {
			const nextHistory = history.slice(0, -1);
			const previousStep =
				history[history.length - 2] || getInitialCommitDetailsStep(user);
			setActiveStep(previousStep);
			setErrorMessage("");
			setSuccessMessage("");
			return nextHistory;
		});
	}, [onBack, stepHistory.length, user]);

	useEffect(() => {
		persistCommitFlow(draft, activeStep);
	}, [activeStep, draft, persistCommitFlow]);

	useEffect(() => {
		if (activeStep !== "otp" || !otpExpiresAt) return undefined;

		setOtpCountdownTick(Date.now());
		const intervalId = setInterval(() => {
			setOtpCountdownTick(Date.now());
		}, 1000);

		return () => clearInterval(intervalId);
	}, [activeStep, otpExpiresAt]);

	useEffect(() => {
		if (activeStep !== "otp") {
			otpAutoSubmittedRef.current = "";
			return;
		}

		const otp = sanitizeCommitOtp(draft.otp);
		if (otp.length < 6) {
			otpAutoSubmittedRef.current = "";
		}
	}, [activeStep, draft.otp]);

	useEffect(() => {
		if (activeStep !== "phone") {
			autoAdvancedRef.current = false;
			return;
		}

		const resolvedEmail = sanitizeCommitEmail(draft.email || user?.email);
		const resolvedPhone = sanitizeCommitPhone(user?.phone);
		if (!resolvedEmail || !isCommitPhoneValid(resolvedPhone)) return;
		if (autoAdvancedRef.current) return;

		autoAdvancedRef.current = true;
		onConfirm?.(hospital, transport, {
			email: resolvedEmail,
			phone: resolvedPhone,
			careIntent: payload?.careIntent || null,
			roomId: payload?.roomId || null,
		});
	}, [
		activeStep,
		draft.email,
		hospital,
		onConfirm,
		transport,
		user?.email,
		user?.phone,
		payload?.careIntent,
		payload?.roomId,
	]);

	const goToStep = useCallback((nextStep) => {
		if (!STEP_ORDER.includes(nextStep)) return;
		setStepHistory((history) => [...history, nextStep]);
		setActiveStep(nextStep);
		setErrorMessage("");
		setSuccessMessage("");
	}, []);

	const phoneDisplayValue = useMemo(
		() => phoneFormattedNumber || phoneRawInput || draft.phone,
		[phoneFormattedNumber, phoneRawInput, draft.phone],
	);

	const currentStepConfig = useMemo(() => {
		switch (activeStep) {
			case "email":
				return {
					key: "email",
					...MAP_COMMIT_DETAILS_COPY.EMAIL_STEP,
					value: draft.email,
				};
			case "otp":
				return {
					key: "otp",
					...MAP_COMMIT_DETAILS_COPY.OTP_STEP,
					description: draft.email
						? `Sent to ${sanitizeCommitEmail(draft.email)}`
						: MAP_COMMIT_DETAILS_COPY.OTP_STEP.description,
					value: draft.otp,
				};
			case "phone":
			default:
				return {
					key: "phone",
					...MAP_COMMIT_DETAILS_COPY.PHONE_STEP,
					value: phoneDisplayValue,
				};
		}
	}, [activeStep, draft.email, draft.otp, phoneDisplayValue]);

	const otpRemainingSeconds = useMemo(() => {
		if (activeStep !== "otp" || !otpExpiresAt) return null;
		const now = otpCountdownTick || Date.now();
		return Math.max(0, Math.ceil((otpExpiresAt - now) / 1000));
	}, [activeStep, otpCountdownTick, otpExpiresAt]);

	const careIntent = payload?.careIntent || null;
	const headerSubtitle = useMemo(() => {
		const hospitalName =
			hospital?.name || hospital?.title || hospital?.service_name || "";
		const transportName =
			transport?.title ||
			transport?.service_name ||
			transport?.name ||
			transport?.label ||
			"";
		const careLabel =
			careIntent === "bed"
				? "Bed booking"
				: careIntent === "both"
					? "Ambulance + bed"
					: null;

		const contextParts = [hospitalName];
		const detailLabel = transportName || careLabel;
		if (detailLabel) {
			contextParts.push(detailLabel);
		}
		const suffix = contextParts.filter(Boolean).join(" · ");
		return suffix ? `For ${suffix}` : "For this request";
	}, [
		careIntent,
		hospital?.name,
		hospital?.service_name,
		hospital?.title,
		transport,
	]);

	const handleChangeValue = useCallback(
		(nextValue) => {
			setErrorMessage("");
			setSuccessMessage("");
			if (activeStep === "email") {
				if (!String(nextValue || "").trim()) {
					void contactInputMemoryService.forgetEmail();
				}
				setDraft((currentDraft) => ({
					...currentDraft,
					email: sanitizeCommitEmail(nextValue),
				}));
				return;
			}
			if (activeStep === "otp") {
				setDraft((currentDraft) => ({
					...currentDraft,
					otp: sanitizeCommitOtp(nextValue),
				}));
				return;
			}
			if (!String(nextValue || "").trim()) {
				void contactInputMemoryService.forgetPhone();
			}
			phoneSeedValueRef.current = sanitizeCommitPhone(nextValue);
			setPhoneRawInput(nextValue);
			setDraft((currentDraft) => ({
				...currentDraft,
				phone: nextValue,
			}));
		},
		[activeStep, setPhoneRawInput],
	);

	const handleSubmitEmail = useCallback(async () => {
		const nextEmail = sanitizeCommitEmail(draft.email);
		if (!isCommitEmailValid(nextEmail)) {
			setErrorMessage("Enter a valid email address.");
			return;
		}
		const pendingStartedAt = Date.now();
		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			await authService.setEmergencyProfileCompletionDeferred?.(true);
			const result = await authService.requestOtp({
				email: nextEmail,
				reviewDemoAuthAllowed: true,
			});
			await waitForMinimumPending(pendingStartedAt);
			if (!result?.success) {
				setErrorMessage(
					normalizeApiErrorMessage(result?.error, "Could not send code."),
				);
				return;
			}
			void contactInputMemoryService.rememberEmail(nextEmail);
			setDraft((currentDraft) => ({
				...currentDraft,
				email: nextEmail,
				otp: "",
			}));
			setOtpExpiresAt(Date.now() + OTP_EXPIRY_MS);
			setOtpCountdownTick(Date.now());
			persistCommitFlow(
				{
					email: nextEmail,
					phone: draft.phone,
				},
				"otp",
			);
			goToStep("otp");
			setSuccessMessage(`Code sent to ${nextEmail}`);
		} finally {
			setIsSubmitting(false);
		}
	}, [draft.phone, draft.email, goToStep, persistCommitFlow]);

	const handleResendOtp = useCallback(async () => {
		const nextEmail = sanitizeCommitEmail(draft.email);
		if (!isCommitEmailValid(nextEmail) || isSubmitting) return;
		const pendingStartedAt = Date.now();
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await authService.setEmergencyProfileCompletionDeferred?.(true);
			const result = await authService.requestOtp({
				email: nextEmail,
				reviewDemoAuthAllowed: true,
			});
			await waitForMinimumPending(pendingStartedAt);
			if (!result?.success) {
				setErrorMessage(
					normalizeApiErrorMessage(result?.error, "Could not resend code."),
				);
				return;
			}
			setDraft((currentDraft) => ({ ...currentDraft, otp: "" }));
			setOtpExpiresAt(Date.now() + OTP_EXPIRY_MS);
			setOtpCountdownTick(Date.now());
			setSuccessMessage(`New code sent to ${nextEmail}`);
		} finally {
			setIsSubmitting(false);
		}
	}, [draft.email, isSubmitting]);

	const handleSubmitOtp = useCallback(async () => {
		const otp = sanitizeCommitOtp(draft.otp);
		const resolvedEmail = sanitizeCommitEmail(draft.email);
		if (otp.length !== 6) {
			setErrorMessage("Enter the 6-digit code.");
			return;
		}
		if (otpExpiresAt && Date.now() >= otpExpiresAt) {
			setErrorMessage("Code expired. Resend a new code.");
			return;
		}
		const pendingStartedAt = Date.now();
		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			await authService.setEmergencyProfileCompletionDeferred?.(true);
			const result = await authService.verifyOtp({
				email: sanitizeCommitEmail(draft.email),
				otp,
				reviewDemoAuthAllowed: true,
			});
			await waitForMinimumPending(pendingStartedAt);
			if (!result?.success) {
				setErrorMessage(
					normalizeApiErrorMessage(result?.error, "Could not verify code."),
				);
				return;
			}
			void contactInputMemoryService.rememberEmail(resolvedEmail);
			await syncUserData?.();
			const verifiedPhone = sanitizeCommitPhone(
				result?.data?.phone || user?.phone || "",
			);
			setDraft((currentDraft) => ({
				...currentDraft,
				otp: "",
				phone: verifiedPhone || currentDraft.phone,
			}));
			if (isCommitPhoneValid(verifiedPhone)) {
				onConfirm?.(hospital, transport, {
					email: resolvedEmail,
					phone: verifiedPhone,
				});
				return;
			}
			persistCommitFlow(
				{
					email: resolvedEmail,
					phone: verifiedPhone || draft.phone,
				},
				"phone",
			);
			goToStep("phone");
		} finally {
			setIsSubmitting(false);
		}
	}, [
		draft.email,
		draft.otp,
		draft.phone,
		goToStep,
		hospital,
		onConfirm,
		otpExpiresAt,
		persistCommitFlow,
		syncUserData,
		transport,
		user?.phone,
	]);

	useEffect(() => {
		if (activeStep !== "otp") return;
		const otp = sanitizeCommitOtp(draft.otp);
		if (otp.length !== 6 || isSubmitting) return;
		if (otpAutoSubmittedRef.current === otp) return;
		otpAutoSubmittedRef.current = otp;
		void handleSubmitOtp();
	}, [activeStep, draft.otp, handleSubmitOtp, isSubmitting]);

	const handleSubmitPhone = useCallback(async () => {
		const normalizedPhone = phoneE164Format || sanitizeCommitPhone(draft.phone);
		const isPhoneValidForSubmit = phoneE164Format
			? true
			: isCommitPhoneValid(normalizedPhone) && isPhoneResolvedValid;
		if (!isPhoneValidForSubmit || !normalizedPhone) {
			setErrorMessage("Enter a valid phone number.");
			return;
		}
		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			const shouldPersistPhone =
				normalizedPhone !== sanitizeCommitPhone(user?.phone);
			if (shouldPersistPhone) {
				const pendingStartedAt = Date.now();
				const result = await authService.updateUser({ phone: normalizedPhone });
				await waitForMinimumPending(pendingStartedAt);
				if (!result?.data) {
					setErrorMessage("Could not save phone number.");
					return;
				}
				await syncUserData?.();
			}
			void contactInputMemoryService.rememberPhone(normalizedPhone);
			setDraft((currentDraft) => ({ ...currentDraft, phone: normalizedPhone }));
			persistCommitFlow(
				{
					email: sanitizeCommitEmail(draft.email || user?.email),
					phone: normalizedPhone,
				},
				"phone",
			);
			onConfirm?.(hospital, transport, {
				email: sanitizeCommitEmail(draft.email || user?.email),
				phone: normalizedPhone,
			});
		} catch (error) {
			setErrorMessage(error?.message || "Could not save phone number.");
		} finally {
			setIsSubmitting(false);
		}
	}, [
		draft.email,
		draft.phone,
		hospital,
		onConfirm,
		persistCommitFlow,
		phoneE164Format,
		isPhoneResolvedValid,
		syncUserData,
		transport,
		user?.email,
		user?.phone,
	]);

	const handleSubmit = useCallback(() => {
		if (activeStep === "email") {
			void handleSubmitEmail();
			return;
		}
		if (activeStep === "otp") {
			void handleSubmitOtp();
			return;
		}
		void handleSubmitPhone();
	}, [activeStep, handleSubmitEmail, handleSubmitOtp, handleSubmitPhone]);

	return {
		activeStep,
		currentStepConfig,
		headerSubtitle,
		errorMessage,
		successMessage,
		otpRemainingSeconds,
		isSubmitting,
		handleBack,
		handleChangeValue,
		handleSubmit,
		handleResendOtp,
		phoneField:
			activeStep === "phone"
				? {
						country: phoneCountry,
						countryLoading: isPhoneCountryLoading,
						isValid: isPhoneResolvedValid,
						onSelectCountry: setPhoneCountry,
					}
				: null,
	};
}
