import React, { useCallback, useMemo } from "react";
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
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
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
		if (decision.hospital?.id && decision.recommendedService?.id) {
			onSelectService?.(
				decision.hospital.id,
				"ambulanceServiceId",
				decision.recommendedService.id,
			);
		}
		onConfirm?.(decision.hospital, decision.recommendedService);
	}, [decision.hospital, decision.recommendedService, onConfirm, onSelectService]);

	const handleSelectDispatchOption = useCallback(
		(option) => {
			if (!decision.hospital?.id || !option?.id) return;
			onSelectService?.(decision.hospital.id, "ambulanceServiceId", option.id);
		},
		[decision.hospital?.id, onSelectService],
	);

	const handleAdvanceSelectedDispatchOption = useCallback(
		(option) => {
			if (!option?.id || option.id !== decision.recommendedService?.id) {
				return;
			}
			handleConfirm();
		},
		[decision.recommendedService?.id, handleConfirm],
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
					titleColor={titleColor}
					subtitleColor={mutedColor}
					closeSurfaceColor={closeSurfaceColor}
					onClose={onClose}
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
							titleColor={titleColor}
							mutedColor={mutedColor}
							surfaceColor={surfaceColor}
							pillSurfaceColor={pillSurfaceColor}
							onOpenServiceDetails={handleOpenServiceDetails}
						/>

						<View style={styles.sectionGap} />

						{!isExpanded ? (
							<>
								<View style={styles.midSwitchSpacingTop} />
								<MapAmbulanceDecisionSwitchRow
									serviceOptions={decision.serviceOptions}
									selectedServiceId={decision.recommendedService?.id || null}
									titleColor={titleColor}
									mutedColor={mutedColor}
									pillSurfaceColor={pillSurfaceColor}
									isDarkMode={isDarkMode}
									onSelectService={handleSelectDispatchOption}
									onAdvanceSelectedService={handleAdvanceSelectedDispatchOption}
								/>
								<View style={styles.midSwitchSpacingBottom} />
							</>
						) : null}

						{isExpanded ? (
							<>
								<View style={styles.sectionGap} />

								<MapAmbulanceDecisionExpandedChoices
									decision={decision}
									titleColor={titleColor}
									mutedColor={mutedColor}
									pillSurfaceColor={pillSurfaceColor}
									isDarkMode={isDarkMode}
									onSelectService={handleSelectDispatchOption}
								/>

								<View style={styles.sectionGap} />

								<MapAmbulanceDecisionRouteCard
									decision={decision}
									glassTokens={glassTokens}
									isDarkMode={isDarkMode}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={nestedSurfaceColor}
									pillSurfaceColor={pillSurfaceColor}
								/>

								<View style={styles.sectionGap} />

								<MapAmbulanceDecisionDetailsCard
									decision={decision}
									glassTokens={glassTokens}
									isDarkMode={isDarkMode}
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

				<View style={styles.sectionGap} />

				<MapAmbulanceDecisionFooter
					modalContainedStyle={null}
					canConfirm={Boolean(decision.hospital)}
					canBrowseHospitals={canBrowseHospitals}
					onConfirm={handleConfirm}
					onOpenHospitals={onOpenHospitals}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
