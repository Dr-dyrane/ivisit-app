import React, { useMemo } from "react";
import { Platform, View } from "react-native";
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
import { MapCommitDetailsTopSlot } from "../commitDetails/MapCommitDetailsStageParts";
import {
	MapCommitTriageHeroBlock,
	MapCommitTriageOptionsStep,
	MapCommitTriageTextStep,
} from "./MapCommitTriageStageParts";
import buildCommitTriageThemeTokens from "./mapCommitTriage.theme";
import useMapCommitTriageController from "./useMapCommitTriageController";
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

	const {
		titleColor,
		mutedColor,
		closeSurface,
		accentColor,
		dangerColor,
		orbSurfaceColor,
		optionSurfaceColor,
		optionSelectedSurfaceColor,
		optionSelectedBorderColor,
		secondarySurfaceColor,
		noteSurfaceColor,
		noteBorderColor,
		prioritySurfaceColor,
	} = useMemo(
		() => buildCommitTriageThemeTokens({ isDarkMode, tokens }),
		[isDarkMode, tokens],
	);

	const {
		activeStep,
		draft,
		showExtendedComplaints,
		isCritical,
		progressLabel,
		promptText,
		topSlotTitle,
		topSlotSubtitle,
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
		handleContinue,
	} = useMapCommitTriageController({
		hospital,
		transport,
		payload,
		stageMetrics,
		onBack,
		onConfirm,
	});

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
					title={topSlotTitle}
					subtitle={topSlotSubtitle}
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
					<MapCommitTriageHeroBlock
						progressLabel={progressLabel}
						onSkipAll={handleSkipAll}
						secondarySurfaceColor={secondarySurfaceColor}
						mutedColor={mutedColor}
						titleColor={titleColor}
						orbSize={orbSize}
						orbRadius={orbRadius}
						orbSurfaceColor={orbSurfaceColor}
						orbScale={orbScale}
						orbIconSize={orbIconSize}
						promptText={promptText}
						isCritical={isCritical}
						prioritySurfaceColor={prioritySurfaceColor}
						dangerColor={dangerColor}
					/>

					{activeStep.type === "text" ? (
						<MapCommitTriageTextStep
							value={draft.note || ""}
							onChangeText={handleNoteChange}
							onSkip={handleSkip}
							onContinue={handleContinue}
							noteSurfaceColor={noteSurfaceColor}
							noteBorderColor={noteBorderColor}
							mutedColor={mutedColor}
							titleColor={titleColor}
							secondarySurfaceColor={secondarySurfaceColor}
							accentColor={accentColor}
						/>
					) : (
						<MapCommitTriageOptionsStep
							activeStep={activeStep}
							draft={draft}
							showExtendedComplaints={showExtendedComplaints}
							onShowMoreSymptoms={handleShowMoreSymptoms}
							onSelectOption={handleSelectOption}
							onSkip={handleSkip}
							accentColor={accentColor}
							mutedColor={mutedColor}
							titleColor={titleColor}
							secondarySurfaceColor={secondarySurfaceColor}
							optionSurfaceColor={optionSurfaceColor}
							optionSelectedSurfaceColor={optionSelectedSurfaceColor}
							optionSelectedBorderColor={optionSelectedBorderColor}
						/>
					)}
				</View>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
