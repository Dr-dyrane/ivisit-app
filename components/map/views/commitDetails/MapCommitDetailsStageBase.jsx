import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { useEmergency } from "../../../../contexts/EmergencyContext";
import { authService } from "../../../../services/authService";
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
	const accentColor = tokens.accentColor;
	const closeSurface = tokens.closeSurface;
	const inputSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.05)";
	const avatarSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.05)";

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

	const goToStep = useCallback((nextStep) => {
		if (!STEP_ORDER.includes(nextStep)) return;
		setStepHistory((history) => [...history, nextStep]);
		setActiveStep(nextStep);
		setErrorMessage("");
		setSuccessMessage("");
	}, []);

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
					value: draft.phone,
				};
		}
	}, [activeStep, draft.email, draft.otp, draft.phone]);
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
			setDraft((currentDraft) => ({
				...currentDraft,
				phone: sanitizeCommitPhone(nextValue),
			}));
		},
		[activeStep],
	);

	const handleSubmitEmail = useCallback(async () => {
		const nextEmail = sanitizeCommitEmail(draft.email);
		if (!isCommitEmailValid(nextEmail)) {
			setErrorMessage("Enter a valid email address.");
			return;
		}
		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			await authService.setEmergencyProfileCompletionDeferred?.(true);
			const result = await authService.requestOtp({
				email: nextEmail,
				reviewDemoAuthAllowed: true,
			});
			if (!result?.success) {
				setErrorMessage(result?.error || "Could not send code.");
				return;
			}
			setDraft((currentDraft) => ({ ...currentDraft, email: nextEmail, otp: "" }));
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
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await authService.setEmergencyProfileCompletionDeferred?.(true);
			const result = await authService.requestOtp({
				email: nextEmail,
				reviewDemoAuthAllowed: true,
			});
			if (!result?.success) {
				setErrorMessage(result?.error || "Could not resend code.");
				return;
			}
			setSuccessMessage(`Code sent to ${nextEmail}`);
		} finally {
			setIsSubmitting(false);
		}
	}, [draft.email, isSubmitting]);

	const handleSubmitOtp = useCallback(async () => {
		const otp = sanitizeCommitOtp(draft.otp);
		if (otp.length !== 6) {
			setErrorMessage("Enter the 6-digit code.");
			return;
		}
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
			if (!result?.success) {
				setErrorMessage(result?.error || "Could not verify code.");
				return;
			}
			await syncUserData?.();
			const verifiedPhone = sanitizeCommitPhone(result?.data?.phone || "");
			setDraft((currentDraft) => ({
				...currentDraft,
				otp: "",
				phone: verifiedPhone || currentDraft.phone,
			}));
			persistCommitFlow(
				{
					email: sanitizeCommitEmail(draft.email),
					phone: verifiedPhone || draft.phone,
				},
				"phone",
			);
			goToStep("phone");
		} finally {
			setIsSubmitting(false);
		}
	}, [draft.email, draft.otp, draft.phone, goToStep, persistCommitFlow, syncUserData]);

	const handleSubmitPhone = useCallback(async () => {
		const phone = sanitizeCommitPhone(draft.phone);
		if (!isCommitPhoneValid(phone)) {
			setErrorMessage("Enter a valid phone number.");
			return;
		}
		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			const shouldPersistPhone = phone !== sanitizeCommitPhone(user?.phone);
			if (shouldPersistPhone) {
				const result = await authService.updateUser({ phone });
				if (!result?.data) {
					setErrorMessage("Could not save phone number.");
					setIsSubmitting(false);
					return;
				}
				await syncUserData?.();
			}
			onConfirm?.(hospital, transport, {
				email: sanitizeCommitEmail(draft.email || user?.email),
				phone,
			});
		} catch (error) {
			setErrorMessage(error?.message || "Could not save phone number.");
			setIsSubmitting(false);
		}
	}, [draft.email, draft.phone, hospital, onConfirm, syncUserData, transport, user?.email, user?.phone]);

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
					step={currentStepConfig}
					value={currentStepConfig.value}
					errorMessage={errorMessage}
					successMessage={successMessage}
					isSubmitting={isSubmitting}
					onChangeValue={handleChangeValue}
					onSubmit={handleSubmit}
					onResend={activeStep === "otp" ? handleResendOtp : undefined}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
