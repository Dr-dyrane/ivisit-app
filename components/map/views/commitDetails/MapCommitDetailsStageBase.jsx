import React, { useMemo } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import {
	MapCommitDetailsQuestionCard,
	MapCommitDetailsTopSlot,
} from "./MapCommitDetailsStageParts";
import buildCommitDetailsThemeTokens from "./mapCommitDetails.theme";
import useMapCommitDetailsController from "./useMapCommitDetailsController";
import styles from "./mapCommitDetails.styles";

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
	const effectiveSnapState = MAP_SHEET_SNAP_STATES.EXPANDED;
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const {
		isSidebarPresentation,
		contentMaxWidth,
		presentationMode,
		shellWidth,
		shouldUseWideStageInset,
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
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;

	const {
		titleColor,
		mutedColor,
		accentColor,
		statusTextColor,
		successColor,
		errorColor,
		resendSurfaceColor,
		disabledTextColor,
		closeSurface,
		inputSurfaceColor,
		avatarSurfaceColor,
	} = useMemo(
		() => buildCommitDetailsThemeTokens({ isDarkMode, tokens }),
		[isDarkMode, tokens],
	);

	const {
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
		phoneField,
	} = useMapCommitDetailsController({
		hospital,
		transport,
		payload,
		onBack,
		onConfirm,
	});

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={effectiveSnapState}
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
					presentationMode === "modal"
						? sheetStageStyles.bodyScrollContentModal
						: null,
					isSidebarPresentation
						? sheetStageStyles.bodyScrollContentPanel
						: null,
					isSidebarPresentation
						? sheetStageStyles.bodyScrollContentSidebar
						: null,
					shouldUseWideStageInset
						? sheetStageStyles.bodyScrollContentWide
						: null,
					modalContainedStyle,
					styles.bodyContent,
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
					phoneField={phoneField}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
