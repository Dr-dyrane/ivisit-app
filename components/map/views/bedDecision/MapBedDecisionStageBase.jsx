import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import {
	GLASS_SURFACE_VARIANTS,
	getGlassSurfaceTokens,
} from "../../../../constants/surfaces";
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
	MapBedDecisionDetailsCard,
	MapBedDecisionEmptyState,
	MapBedDecisionExpandedRoomChoices,
	MapBedDecisionFooter,
	MapBedDecisionHero,
	MapBedDecisionRouteCard,
	MapBedDecisionRoomSwitchRow,
	MapBedDecisionSavedTransportCard,
	MapBedDecisionTopSlot,
} from "./MapBedDecisionStageParts";
import styles from "./mapBedDecision.styles";
import useMapBedDecisionModel from "./useMapBedDecisionModel";

export default function MapBedDecisionStageBase({
	sheetHeight,
	snapState,
	hospital,
	origin = null,
	careIntent = "bed",
	savedTransport = null,
	decisionPhase = MAP_SHEET_PHASES.BED_DECISION,
	hospitalCount = 0,
	selectedRoomServiceId = null,
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
	const decision = useMapBedDecisionModel({
		hospital,
		origin,
		careIntent,
		selectedRoomServiceId,
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

	const handleOpenRoomDetails = useCallback(() => {
		if (
			!decision.hospital ||
			!decision.recommendedRoom ||
			decision.enabledRoomOptions.length === 0 ||
			!onOpenServiceDetail
		) {
			return;
		}

		onOpenServiceDetail({
			hospital: decision.hospital,
			service: decision.recommendedRoom,
			serviceType: "room",
			serviceItems: decision.enabledRoomOptions,
			sourcePhase: decisionPhase,
			sourceSnapState: snapState,
			sourcePayload: {
				careIntent,
				savedTransport: careIntent === "both" ? savedTransport || null : null,
			},
		});
	}, [
		careIntent,
		decisionPhase,
		decision.enabledRoomOptions,
		decision.hospital,
		decision.recommendedRoom,
		onOpenServiceDetail,
		savedTransport,
		snapState,
	]);

	const handleConfirm = useCallback(() => {
		if (!canConfirm) return;
		if (decision.hospital?.id && decision.recommendedRoom?.id) {
			onSelectService?.(
				decision.hospital.id,
				"roomServiceId",
				decision.recommendedRoom.id,
			);
		}
		onConfirm?.(
			decision.hospital,
			decision.recommendedRoom,
			null,
			careIntent,
		);
	}, [
		canConfirm,
		careIntent,
		decision.hospital,
		decision.recommendedRoom,
		onConfirm,
		onSelectService,
	]);

	const handleCommit = useCallback(() => {
		beginAdvance(handleConfirm);
	}, [beginAdvance, handleConfirm]);

	const handleSelectRoom = useCallback(
		(option) => {
			if (isAdvancing) return;
			if (!decision.hospital?.id || !option?.id) return;
			onSelectService?.(decision.hospital.id, "roomServiceId", option.id);
		},
		[decision.hospital?.id, isAdvancing, onSelectService],
	);

	const handleAdvanceSelectedRoom = useCallback(
		(option) => {
			if (!option?.id || option.id !== decision.recommendedRoom?.id) {
				return;
			}
			handleCommit();
		},
		[decision.recommendedRoom?.id, handleCommit],
	);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				<MapBedDecisionTopSlot
					modalContainedStyle={modalContainedStyle}
					contentInsetStyle={webWideTopSlotInsetStyle}
					titleColor={titleColor}
					subtitleColor={mutedColor}
					closeSurfaceColor={closeSurfaceColor}
					onClose={onClose}
					onToggle={handleHeaderToggle}
					toggleAccessibilityLabel={
						snapState === MAP_SHEET_SNAP_STATES.EXPANDED
							? "Collapse bed sheet"
							: "Expand bed sheet"
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
						<MapBedDecisionHero
							decision={decision}
							glassTokens={glassTokens}
							isDarkMode={isDarkMode}
							titleColor={titleColor}
							surfaceColor={surfaceColor}
							onOpenRoomDetails={handleOpenRoomDetails}
						/>

						{careIntent === "both" ? (
							<>
								<View style={styles.sectionGap} />
								<MapBedDecisionSavedTransportCard
									savedTransport={savedTransport}
									glassTokens={glassTokens}
									isDarkMode={isDarkMode}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={nestedSurfaceColor}
									pillSurfaceColor={pillSurfaceColor}
								/>
							</>
						) : null}

						<View style={styles.sectionGap} />

						{!isExpanded && decision.roomOptions.length > 1 ? (
							<>
								<View style={styles.midSwitchSpacingTop} />
								<MapBedDecisionRoomSwitchRow
									roomOptions={decision.roomOptions}
									selectedRoomServiceId={decision.recommendedRoom?.id || null}
									isDarkMode={isDarkMode}
									onSelectRoom={handleSelectRoom}
									onAdvanceSelectedRoom={handleAdvanceSelectedRoom}
								/>
								<View style={styles.midSwitchSpacingBottom} />
							</>
						) : null}

						{isExpanded ? (
							<>
								<MapBedDecisionExpandedRoomChoices
									decision={decision}
									titleColor={titleColor}
									mutedColor={mutedColor}
									isDarkMode={isDarkMode}
									onSelectRoom={handleSelectRoom}
								/>

								<View style={styles.sectionGap} />

								<MapBedDecisionRouteCard
									decision={decision}
									glassTokens={glassTokens}
									isDarkMode={isDarkMode}
									titleColor={titleColor}
									mutedColor={mutedColor}
									surfaceColor={nestedSurfaceColor}
									pillSurfaceColor={pillSurfaceColor}
								/>

								<View style={styles.sectionGap} />

								<MapBedDecisionDetailsCard
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
							<MapBedDecisionRouteCard
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
					<MapBedDecisionEmptyState
						titleColor={titleColor}
						mutedColor={mutedColor}
						surfaceColor={surfaceColor}
						glassTokens={glassTokens}
						isDarkMode={isDarkMode}
					/>
				)}

				<View style={styles.sectionGap} />

				<MapBedDecisionFooter
					modalContainedStyle={null}
					canConfirm={canConfirm}
					canBrowseHospitals={canBrowseHospitals}
					careIntent={careIntent}
					isAdvancing={isAdvancing}
					onConfirm={handleCommit}
					onOpenHospitals={onOpenHospitals}
				/>
			</MapStageBodyScroll>
		</MapSheetShell>
	);
}
