import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import useCountryDetection from "../../../../hooks/validators/useCountryDetection";
import usePhoneValidation from "../../../../hooks/validators/usePhoneValidation";
import { authService } from "../../../../services/authService";
import {
	normalizeApiErrorMessage,
	waitForMinimumPending,
} from "../../../../utils/ui/apiInteractionFeedback";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import { MAP_COMMIT_DETAILS_COPY } from "./mapCommitDetails.content";
import {
	getInitialCommitDetailsStep,
	isCommitEmailValid,
	isCommitPhoneValid,
	sanitizeCommitEmail,
	sanitizeCommitOtp,
	sanitizeCommitPhone,
} from "./mapCommitDetails.helpers";
import {
	MapCommitDetailsTopSlot,
	MapCommitDetailsQuestionCard,
} from "./MapCommitDetailsStageParts";
import styles from "./mapCommitDetails.styles";

const STEP_ORDER = ["email", "otp", "phone"];
const OTP_EXPIRY_MS = 10 * 60 * 1000;

export default function MapCommitDetailsStageBase({
	sheetHeight,
	snapState,
	hospital,
	transport,
	payload = null,
	currentLocation = null,
	onBack,
	onClose,
	onConfirm,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const { user, syncUserData } = useAuth();
	const { setCommitFlow } = useEmergency();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const allowedSnapStates = useMemo(
		() => [MAP_SHEET_SNAP_STATES.EXPANDED],
		[],
	);
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
		snapState,
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
		snapState,
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
	const accentColor = isDarkMode ? "#FCA5A5" : "#86100E";
	const statusTextColor = isDarkMode ? "#CBD5E1" : "#334155";
	const successColor = isDarkMode ? "#A7F3D0" : "#047857";
	const errorColor = isDarkMode ? "#FCA5A5" : "#B91C1C";
	const resendSurfaceColor = isDarkMode
		? "rgba(252, 165, 165, 0.14)"
		: "rgba(134, 16, 14, 0.10)";
	const disabledTextColor = isDarkMode
		? "rgba(203, 213, 225, 0.58)"
		: "rgba(71, 85, 105, 0.58)";
	const closeSurface = tokens.closeSurface;
	const inputSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.05)";
	const avatarSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.05)";
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
		setDraft((currentDraft) => ({
			...currentDraft,
			email: currentDraft.email || sanitizeCommitEmail(user?.email),
			phone: currentDraft.phone || sanitizeCommitPhone(user?.phone),
		}));
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
	}, [activeStep, draft.phone, phoneCountry, user?.phone]);

	const handleBack = useCallback(() => {
		if (stepHistory.length === 0) {
			onBack?.();
			return;
		}
		setStepHistory((history) => {
			const nextHistory = history.slice(0, -1);
			const previousStep = history[history.length - 2] || getInitialCommitDetailsStep(user);
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
		});
	}, [activeStep, draft.email, hospital, onConfirm, transport, user?.email, user?.phone]);

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
	const headerSubtitle = useMemo(() => {
		const hospitalName = hospital?.name || hospital?.title || hospital?.service_name || "";
		const transportName =
			transport?.title ||
			transport?.service_name ||
			transport?.name ||
			transport?.label ||
			"";
		const context = [hospitalName, transportName].filter(Boolean).join(" · ");

		return context ? `For ${context}` : "For this request";
	}, [hospital?.name, hospital?.service_name, hospital?.title, transport]);

	const handleChangeValue = useCallback(
		(nextValue) => {
			setErrorMessage("");
			setSuccessMessage("");
			if (activeStep === "email") {
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
				setErrorMessage(normalizeApiErrorMessage(result?.error, "Could not send code."));
				return;
			}
			setDraft((currentDraft) => ({ ...currentDraft, email: nextEmail, otp: "" }));
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
				setErrorMessage(normalizeApiErrorMessage(result?.error, "Could not resend code."));
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
				setErrorMessage(normalizeApiErrorMessage(result?.error, "Could not verify code."));
				return;
			}
			await syncUserData?.();
			const verifiedPhone = sanitizeCommitPhone(result?.data?.phone || user?.phone || "");
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
			const shouldPersistPhone = normalizedPhone !== sanitizeCommitPhone(user?.phone);
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

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={MAP_SHEET_SNAP_STATES.EXPANDED}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapCommitDetailsTopSlot
					title={currentStepConfig.headerTitle}
					subtitle={headerSubtitle}
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
					presentationMode === "modal" ? sheetStageStyles.bodyScrollContentModal : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentPanel : null,
					isSidebarPresentation ? sheetStageStyles.bodyScrollContentSidebar : null,
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
				<MapCommitDetailsQuestionCard
					stageMetrics={stageMetrics}
					inputSurfaceColor={inputSurfaceColor}
					avatarSurfaceColor={avatarSurfaceColor}
					titleColor={titleColor}
					mutedColor={mutedColor}
					accentColor={accentColor}
					statusTextColor={statusTextColor}
					successColor={successColor}
					errorColor={errorColor}
					resendSurfaceColor={resendSurfaceColor}
					disabledTextColor={disabledTextColor}
					step={currentStepConfig}
					value={currentStepConfig.value}
					selectionColor={accentColor}
					errorMessage={errorMessage}
					successMessage={successMessage}
					otpRemainingSeconds={otpRemainingSeconds}
					isSubmitting={isSubmitting}
					onChangeValue={handleChangeValue}
					onSubmit={handleSubmit}
					onResend={activeStep === "otp" ? handleResendOtp : undefined}
					phoneField={
						activeStep === "phone"
							? {
									country: phoneCountry,
									countryLoading: isPhoneCountryLoading,
									isValid: isPhoneResolvedValid,
									onSelectCountry: setPhoneCountry,
								}
							: null
					}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
