// components/map/views/providerDetail/MapProviderDetailStageBase.jsx
//
// EXPLORE-CARE-01 — EXP-8: Provider Detail — Full Sheet Phase
// Pure orchestration — exact mirror of MapHospitalDetailStageBase.
// Body content, model logic, and slot parts live in their own files.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import useHospitalDetailQuery from "../../../../hooks/visits/useHospitalDetailQuery";
import useMapProviderDetailModel from "../../surfaces/providerDetail/useMapProviderDetailModel";
import {
	MapProviderDetailBodyContent,
	MapProviderDetailCollapsedTopSlot,
	MapProviderDetailFloatingTopSlot,
} from "./MapProviderDetailStageParts";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import styles from "./mapProviderDetailStage.styles";

const FLOATING_TITLE_REVEAL_DELAY = 160;

function hasCoordinates(provider) {
	return Number.isFinite(provider?.coordinates?.latitude) &&
		Number.isFinite(provider?.coordinates?.longitude);
}

function mergeProviderDetail(incomingProvider, fetchedProvider) {
	if (!incomingProvider) return fetchedProvider ?? null;
	if (!fetchedProvider) return incomingProvider;
	const incomingHasRealImage =
		incomingProvider.imageSource &&
		incomingProvider.imageSource !== "deterministic_fallback";
	const incomingPhotos = Array.isArray(incomingProvider.googlePhotos)
		? incomingProvider.googlePhotos
		: [];
	const fetchedPhotos = Array.isArray(fetchedProvider.googlePhotos)
		? fetchedProvider.googlePhotos
		: [];

	return {
		...incomingProvider,
		...fetchedProvider,
		image: incomingHasRealImage
			? (incomingProvider.image ?? fetchedProvider.image)
			: (fetchedProvider.image ?? incomingProvider.image),
		imageSource: incomingHasRealImage
			? incomingProvider.imageSource
			: (fetchedProvider.imageSource ?? incomingProvider.imageSource),
		imageConfidence: incomingHasRealImage
			? incomingProvider.imageConfidence
			: (fetchedProvider.imageConfidence ?? incomingProvider.imageConfidence),
		googlePhotos: Array.from(new Set([...incomingPhotos, ...fetchedPhotos])),
		distance: incomingProvider.distance ?? fetchedProvider.distance,
		distanceKm: incomingProvider.distanceKm ?? fetchedProvider.distanceKm,
		eta: incomingProvider.eta ?? fetchedProvider.eta,
		coordinates: hasCoordinates(incomingProvider)
			? incomingProvider.coordinates
			: fetchedProvider.coordinates,
		hasValidCoordinates: incomingProvider.hasValidCoordinates ?? fetchedProvider.hasValidCoordinates,
		providerLocalityScope:
			incomingProvider.providerLocalityScope ?? fetchedProvider.providerLocalityScope,
		isWideProviderFallback:
			incomingProvider.isWideProviderFallback ?? fetchedProvider.isWideProviderFallback,
	};
}

export default function MapProviderDetailStageBase({
	sheetHeight,
	snapState,
	provider,
	userLocation,
	onClose,
	onSnapStateChange,
}) {
	const { isDarkMode } = useTheme();
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();

	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const shouldShowHeaderToggle = presentationMode === "sheet";

	const providerDetailQuery = useHospitalDetailQuery(provider?.id);
	const resolvedProvider = useMemo(
		() => mergeProviderDetail(provider, providerDetailQuery.data),
		[provider, providerDetailQuery.data],
	);
	const detailStatus = useMemo(
		() => ({
			isFetching: providerDetailQuery.isFetching,
			isError: providerDetailQuery.isError,
			hasFetchedDetail: !!providerDetailQuery.data,
			canRetry: !!provider?.id,
			onRetry: providerDetailQuery.refetch,
		}),
		[
			provider?.id,
			providerDetailQuery.data,
			providerDetailQuery.isError,
			providerDetailQuery.isFetching,
			providerDetailQuery.refetch,
		],
	);
	const model = useMapProviderDetailModel({
		provider: resolvedProvider,
		userLocation,
		onClose,
		detailStatus,
	});

	const [showFloatingTitle, setShowFloatingTitle] = useState(false);
	const [expandedHeaderBottom, setExpandedHeaderBottom] = useState(null);

	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const isHalf      = snapState === MAP_SHEET_SNAP_STATES.HALF;

	const titleColor        = model.titleColor;
	const mutedColor        = model.mutedColor ?? model.subtleColor;
	const closeSurfaceColor = isDarkMode
		? "rgba(148,163,184,0.14)"
		: "rgba(255,255,255,0.42)";
	const iconSurfaceColor  = closeSurfaceColor;

	const shouldShowFloatingTitle =
		isHalf || (snapState === MAP_SHEET_SNAP_STATES.EXPANDED && showFloatingTitle);
	const isHeroTopPresentation =
		snapState === MAP_SHEET_SNAP_STATES.EXPANDED && !showFloatingTitle;

	const floatingTitleColor      = titleColor;
	// Resolved opaque parent surface — FadeEndText needs a non-translucent color
	// so the trailing fade reads as a continuation of the chrome, not a strip.
	const floatingTitleFadeColor  = isDarkMode ? "#0F172A" : "#FFFFFF";
	const floatingCloseIconColor  = isHeroTopPresentation ? "#F8FAFC" : titleColor;
	const floatingToggleIconColor = isHeroTopPresentation
		? "#F8FAFC"
		: isDarkMode
			? "rgba(248,250,252,0.92)"
			: "rgba(15,23,42,0.86)";
	const floatingCloseSurface = isHeroTopPresentation
		? "rgba(15,23,42,0.24)"
		: closeSurfaceColor;
	const floatingToggleSurface = isHeroTopPresentation
		? "rgba(15,23,42,0.24)"
		: isDarkMode
			? "rgba(255,255,255,0.10)"
			: "rgba(255,255,255,0.72)";

	const allowedSnapStates = useMemo(
		() => [
			MAP_SHEET_SNAP_STATES.COLLAPSED,
			MAP_SHEET_SNAP_STATES.HALF,
			MAP_SHEET_SNAP_STATES.EXPANDED,
		],
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
	} = useMapSheetDetents({ snapState, onSnapStateChange, presentationMode, allowedSnapStates });

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
		onExpandedToHalf: () => setShowFloatingTitle(false),
	});

	const handleProviderScroll = useCallback(
		(event) => {
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			const nextShowTitle =
				snapState === MAP_SHEET_SNAP_STATES.EXPANDED &&
				offsetY > ((expandedHeaderBottom ?? 88) + FLOATING_TITLE_REVEAL_DELAY);
			setShowFloatingTitle((current) => (current === nextShowTitle ? current : nextShowTitle));
		},
		[expandedHeaderBottom, snapState],
	);

	const handleExpandedHeaderLayout = useCallback((event) => {
		const { y = 0, height = 0 } = event?.nativeEvent?.layout || {};
		const nextBottom = y + height;
		setExpandedHeaderBottom((current) => (current === nextBottom ? current : nextBottom));
	}, []);

	const handleProviderScrollBeginDrag = useCallback(
		(event) => {
			handleAndroidCollapseScrollBeginDrag(event);
		},
		[handleAndroidCollapseScrollBeginDrag],
	);

	const handleCombinedScroll = useCallback(
		(event) => {
			handleAndroidCollapseScroll(event);
			handleProviderScroll(event);
		},
		[handleAndroidCollapseScroll, handleProviderScroll],
	);


	const handleHeaderToggle = useCallback(() => {
		if (typeof onSnapStateChange !== "function") return;
		onSnapStateChange(
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED
				? MAP_SHEET_SNAP_STATES.HALF
				: MAP_SHEET_SNAP_STATES.EXPANDED,
		);
	}, [onSnapStateChange, snapState]);

	useEffect(() => {
		if (snapState !== MAP_SHEET_SNAP_STATES.EXPANDED && showFloatingTitle) {
			setShowFloatingTitle(false);
		}
	}, [showFloatingTitle, snapState]);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				isCollapsed ? (
					<MapProviderDetailCollapsedTopSlot
						model={model}
						onExpand={() => onSnapStateChange?.(MAP_SHEET_SNAP_STATES.HALF)}
						onClose={onClose}
						titleColor={titleColor}
						mutedColor={mutedColor}
						iconSurfaceColor={iconSurfaceColor}
					/>
				) : (
					<MapProviderDetailFloatingTopSlot
						modalContainedStyle={modalContainedStyle}
						contentMaxWidth={contentMaxWidth}
						showToggle={shouldShowHeaderToggle}
						onToggle={handleHeaderToggle}
						toggleAccessibilityLabel={
							snapState === MAP_SHEET_SNAP_STATES.EXPANDED
								? "Collapse provider sheet"
								: "Expand provider sheet"
						}
						toggleIconName={
							snapState === MAP_SHEET_SNAP_STATES.EXPANDED
								? "chevron-down"
								: "chevron-up"
						}
						floatingToggleSurface={floatingToggleSurface}
						floatingTitleFadeColor={floatingTitleFadeColor}
						floatingToggleIconColor={floatingToggleIconColor}
						shouldShowFloatingTitle={shouldShowFloatingTitle}
						floatingTitleColor={floatingTitleColor}
						title={model.summary.title}
						subtitle={isHalf ? model.summary.contextLine : null}
						mutedColor={mutedColor}
						onClose={onClose}
						floatingCloseSurface={floatingCloseSurface}
						floatingCloseIconColor={floatingCloseIconColor}
					/>
				)
			}
			handleFloatsOverContent={!isCollapsed}
			onHandlePress={handleSnapToggle}
		>
			{isCollapsed ? null : (
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
						styles.bodyScrollContent,
					]}
					isSidebarPresentation={isSidebarPresentation}
					allowScrollDetents={allowScrollDetents}
					handleBodyWheel={handleBodyWheel}
					onScrollBeginDrag={handleProviderScrollBeginDrag}
					onScroll={handleCombinedScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
					androidExpandedBodyStyle={androidExpandedBodyStyle}
				>
					<MapProviderDetailBodyContent
						model={model}
						revealHero={snapState === MAP_SHEET_SNAP_STATES.EXPANDED}
						onExpandedHeaderLayout={handleExpandedHeaderLayout}
					/>
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
	);
}
