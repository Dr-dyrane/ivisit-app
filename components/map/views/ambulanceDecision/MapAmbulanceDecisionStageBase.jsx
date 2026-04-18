import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { GLASS_SURFACE_VARIANTS, getGlassSurfaceTokens } from "../../../../constants/surfaces";
import MapSheetShell from "../../MapSheetShell";
import {
	MAP_SHEET_PHASES,
	MAP_SHEET_SNAP_STATES,
} from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useMapStageResponsiveMetrics from "../shared/useMapStageResponsiveMetrics";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import {
	MapAmbulanceDecisionDetailsCard,
	MapAmbulanceDecisionExpandedChoices,
	MapAmbulanceDecisionEmptyState,
	MapAmbulanceDecisionFooter,
	MapAmbulanceDecisionHero,
	MapAmbulanceDecisionRouteCard,
	MapAmbulanceDecisionSwitchRow,
	MapAmbulanceDecisionTopSlot,
} from "./MapAmbulanceDecisionStageParts";
import styles from "./mapAmbulanceDecision.styles";
import useMapAmbulanceDecisionModel from "./useMapAmbulanceDecisionModel";

export default function MapAmbulanceDecisionStageBase({
	sheetHeight,
	snapState,
	hospital,
	origin = null,
	hospitalCount = 0,
	selectedServiceId = null,
	onClose,
	onConfirm,
	onOpenHospitals,
	onOpenServiceDetail,
	onSelectService,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const glassTokens = useMemo(
		() =>
			getGlassSurfaceTokens({
				isDarkMode,
				variant: GLASS_SURFACE_VARIANTS.HEADER,
			}),
		[isDarkMode],
	);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const stageMetrics = useMapStageResponsiveMetrics({ presentationMode });
	const webWideInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideContentInset
			: null;
	const webWideTopSlotInsetStyle =
		Platform.OS === "web" && presentationMode !== "sheet"
			? styles.webWideTopSlotInset
			: null;
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const shouldShowHeaderToggle = presentationMode === "sheet";
	const allowedSnapStates = useMemo(
		() => [MAP_SHEET_SNAP_STATES.HALF, MAP_SHEET_SNAP_STATES.EXPANDED],
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
	const decision = useMapAmbulanceDecisionModel({
		hospital,
		origin,
		selectedServiceId,
	});
	const titleColor = tokens.titleColor;
	const mutedColor = tokens.mutedText;
	const closeSurfaceColor = tokens.closeSurface;
	const surfaceColor =
		Platform.OS === "android"
			? isDarkMode
				? glassTokens.surfaceColor
				: "rgba(255,255,255,0.60)"
			: isDarkMode
				? "rgba(255,255,255,0.075)"
				: "rgba(255,255,255,0.68)";
	const nestedSurfaceColor =
		Platform.OS === "android"
			? isDarkMode
				? "rgba(18,24,38,0.60)"
				: "rgba(255,255,255,0.44)"
			: isDarkMode
				? "rgba(255,255,255,0.055)"
				: "rgba(15,23,42,0.045)";
	const pillSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.05)";
	const canBrowseHospitals = hospitalCount > 1 && typeof onOpenHospitals === "function";
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;
	const canConfirm = Boolean(decision.canConfirm);
	const [isAdvancing, setIsAdvancing] = useState(false);
	const advanceTimeoutRef = useRef(null);

	useEffect(() => {
		return () => {
			if (advanceTimeoutRef.current) {
				clearTimeout(advanceTimeoutRef.current);
			}
		};
	}, []);

	const beginAdvance = useCallback((callback) => {
		if (isAdvancing) return;
		setIsAdvancing(true);
		const schedule =
			typeof requestAnimationFrame === "function"
				? requestAnimationFrame
				: (fn) => setTimeout(fn, 0);
		schedule(() => {
			callback?.();
		});
		if (advanceTimeoutRef.current) {
			clearTimeout(advanceTimeoutRef.current);
		}
		advanceTimeoutRef.current = setTimeout(() => {
			setIsAdvancing(false);
			advanceTimeoutRef.current = null;
		}, 1600);
	}, [isAdvancing]);
	const handleHeaderToggle = useCallback(() => {
		if (typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [onSnapStateChange, snapState]);
	const headerSubtext = useMemo(() => {
		const etaLabel =
			typeof decision.etaLabel === "string" ? decision.etaLabel.trim() : "";
		if (!etaLabel) return null;
		if (/route updating/i.test(etaLabel) || /arriving soon/i.test(etaLabel)) {
			return etaLabel;
		}
		if (/\baway\b/i.test(etaLabel)) {
			return etaLabel;
		}
		return `${etaLabel} away`;
	}, [decision.etaLabel]);

	const handleOpenServiceDetails = useCallback(() => {
		if (
			!decision.hospital ||
			!decision.recommendedService ||
			decision.enabledServiceOptions.length === 0 ||
			!onOpenServiceDetail
		) {
			return;
		}
		onOpenServiceDetail({
			hospital: decision.hospital,
			service: decision.recommendedService,
			serviceType: "ambulance",
			serviceItems: decision.enabledServiceOptions,
			sourcePhase: MAP_SHEET_PHASES.AMBULANCE_DECISION,
			sourceSnapState: snapState,
		});
	}, [
		decision.enabledServiceOptions,
		decision.hospital,
		decision.recommendedService,
		onOpenServiceDetail,
		snapState,
	]);

	const handleConfirm = useCallback(() => {
		if (!canConfirm) return;
		if (decision.hospital?.id && decision.recommendedService?.id) {
			onSelectService?.(
				decision.hospital.id,
				"ambulanceServiceId",
				decision.recommendedService.id,
			);
		}
		onConfirm?.(decision.hospital, decision.recommendedService);
	}, [canConfirm, decision.hospital, decision.recommendedService, onConfirm, onSelectService]);

	const handleCommit = useCallback(() => {
		beginAdvance(handleConfirm);
	}, [beginAdvance, handleConfirm]);

	const handleSelectDispatchOption = useCallback(
		(option) => {
			if (isAdvancing) return;
			if (!decision.hospital?.id || !option?.id) return;
			onSelectService?.(decision.hospital.id, "ambulanceServiceId", option.id);
		},
		[decision.hospital?.id, isAdvancing, onSelectService],
	);

	const handleAdvanceSelectedDispatchOption = useCallback(
		(option) => {
			if (!option?.id || option.id !== decision.recommendedService?.id) {
				return;
			}
			handleCommit();
		},
		[decision.recommendedService?.id, handleCommit],
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapAmbulanceDecisionTopSlot
					modalContainedStyle={modalContainedStyle}
					contentInsetStyle={webWideTopSlotInsetStyle}
					stageMetrics={stageMetrics}
					titleColor={titleColor}
					subtitleColor={mutedColor}
					closeSurfaceColor={closeSurfaceColor}
					onClose={onClose}
					showToggle={shouldShowHeaderToggle}
					onToggle={handleHeaderToggle}
					toggleAccessibilityLabel={
						snapState === MAP_SHEET_SNAP_STATES.EXPANDED
							? "Collapse dispatch sheet"
							: "Expand dispatch sheet"
					}
					hospitalName={decision.hospitalSummary?.title || hospital?.name || "Hospital"}
					hospitalSubtext={headerSubtext}
					toggleIconName={
						snapState === MAP_SHEET_SNAP_STATES.EXPANDED
							? "chevron-down"
							: "chevron-up"
					}
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
				{decision.hospital ? (
					<>
						<MapAmbulanceDecisionHero
							decision={decision}
							glassTokens={glassTokens}
							isDarkMode={isDarkMode}
							stageMetrics={stageMetrics}
							titleColor={titleColor}
							mutedColor={mutedColor}
							surfaceColor={surfaceColor}
							pillSurfaceColor={pillSurfaceColor}
							onOpenServiceDetails={handleOpenServiceDetails}
						/>

						<View style={[styles.sectionGap, stageMetrics.section.gapStyle]} />

						{!isExpanded ? (
							<>
								<View style={styles.midSwitchSpacingTop} />
								<MapAmbulanceDecisionSwitchRow
									serviceOptions={decision.serviceOptions}
									selectedServiceId={decision.recommendedService?.id || null}
									stageMetrics={stageMetrics}
									titleColor={titleColor}
									mutedColor={mutedColor}
									pillSurfaceColor={pillSurfaceColor}
									isDarkMode={isDarkMode}
									onSelectService={handleSelectDispatchOption}
									onAdvanceSelectedService={handleAdvanceSelectedDispatchOption}
								/>
								<View style={[styles.midSwitchSpacingBottom, stageMetrics.section.gapStyle]} />
							</>
						) : null}

						{isExpanded ? (
							<>
								<View style={[styles.sectionGap, stageMetrics.section.gapStyle]} />

								<MapAmbulanceDecisionExpandedChoices
									decision={decision}
									stageMetrics={stageMetrics}
									titleColor={titleColor}
									mutedColor={mutedColor}
									pillSurfaceColor={pillSurfaceColor}
									isDarkMode={isDarkMode}
									onSelectService={handleSelectDispatchOption}
								/>

								<View style={[styles.sectionGap, stageMetrics.section.gapStyle]} />

								<MapAmbulanceDecisionRouteCard
									decision={decision}
									glassTokens={glassTokens}
									isDarkMode={isDarkMode}
									stageMetrics={stageMetrics}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={nestedSurfaceColor}
									pillSurfaceColor={pillSurfaceColor}
								/>

								<View style={[styles.sectionGap, stageMetrics.section.gapStyle]} />

								<MapAmbulanceDecisionDetailsCard
									decision={decision}
									glassTokens={glassTokens}
									isDarkMode={isDarkMode}
									stageMetrics={stageMetrics}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={nestedSurfaceColor}
									pillSurfaceColor={pillSurfaceColor}
								/>
							</>
						) : (
							<MapAmbulanceDecisionRouteCard
								decision={decision}
								glassTokens={glassTokens}
								isDarkMode={isDarkMode}
								stageMetrics={stageMetrics}
								titleColor={titleColor}
								mutedColor={mutedColor}
								surfaceColor={nestedSurfaceColor}
								pillSurfaceColor={pillSurfaceColor}
							/>
						)}
					</>
				) : (
					<MapAmbulanceDecisionEmptyState
						titleColor={titleColor}
						mutedColor={mutedColor}
						surfaceColor={surfaceColor}
						glassTokens={glassTokens}
						isDarkMode={isDarkMode}
					/>
				)}

				<View style={[styles.sectionGap, stageMetrics.section.gapStyle]} />

				<MapAmbulanceDecisionFooter
					modalContainedStyle={null}
					canConfirm={canConfirm}
					canBrowseHospitals={canBrowseHospitals}
					isAdvancing={isAdvancing}
					stageMetrics={stageMetrics}
					onConfirm={handleCommit}
					onOpenHospitals={onOpenHospitals}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
