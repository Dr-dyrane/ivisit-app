import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { SearchBoundary } from "../../../../contexts/SearchContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import MapSheetShell from "../../MapSheetShell";
import { MAP_SHEET_SNAP_STATES } from "../../core/mapSheet.constants";
import useMapSheetDetents from "../../core/useMapSheetDetents";
import { getMapSheetTokens } from "../../tokens/mapSheetTokens";
import useMapSearchSheetModel from "../../surfaces/search/useMapSearchSheetModel";
import sheetStageStyles from "../shared/mapSheetStage.styles";
import MapStageBodyScroll from "../shared/MapStageBodyScroll";
import useMapStageSurfaceLayout from "../shared/useMapStageSurfaceLayout";
import useMapAndroidExpandedCollapse from "../shared/useMapAndroidExpandedCollapse";
import {
	MapSearchActiveTopRow,
	MapSearchBodyContent,
	MapSearchCollapsedTopRow,
} from "./MapSearchStageParts";
import styles from "./mapSearchStage.styles";

function MapSearchStageSurface({
	sheetHeight,
	snapState,
	mode,
	hospitals,
	selectedHospitalId,
	currentLocation,
	onClose,
	onOpenHospital,
	onBrowseHospitals,
	onUseCurrentLocation,
	onSelectLocation,
	onOpenProfile,
	onSnapStateChange,
	profileImageSource,
	isSignedIn,
}) {
	const { isDarkMode } = useTheme();
	const searchInputRef = useRef(null);
	const didAutofocusOnOpenRef = useRef(false);
	const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
	const shouldLockExpandedForWebInput =
		Platform.OS === "web" && isSearchInputFocused;
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const { isSidebarPresentation, contentMaxWidth, presentationMode, shellWidth } =
		useMapStageSurfaceLayout();
	const isCollapsed = snapState === MAP_SHEET_SNAP_STATES.COLLAPSED;
	const modalContainedStyle =
		presentationMode === "modal" && contentMaxWidth
			? { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center" }
			: null;
	const model = useMapSearchSheetModel({
		visible: true,
		mode,
		hospitals,
		selectedHospitalId,
		currentLocation,
		onClose,
		onOpenHospital,
		onBrowseHospitals,
		onUseCurrentLocation,
		onSelectLocation,
	});
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
	} = useMapSheetDetents({
		snapState,
		onSnapStateChange,
		presentationMode,
		allowedSnapStates,
		preventCollapse: shouldLockExpandedForWebInput,
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
		onExpandedToHalf: () => {
			Keyboard.dismiss();
		},
	});
	useEffect(() => {
		if (
			didAutofocusOnOpenRef.current ||
			snapState !== MAP_SHEET_SNAP_STATES.EXPANDED
		) {
			return undefined;
		}

		didAutofocusOnOpenRef.current = true;

		const focusTimer = setTimeout(() => {
			searchInputRef.current?.focus?.();
		}, 180);

		return () => clearTimeout(focusTimer);
	}, [snapState]);

	useEffect(() => {
		if (
			!shouldLockExpandedForWebInput ||
			snapState === MAP_SHEET_SNAP_STATES.EXPANDED
		) {
			return;
		}

		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [onSnapStateChange, shouldLockExpandedForWebInput, snapState]);

	return (
		<MapSheetShell
			sheetHeight={sheetHeight}
			snapState={snapState}
			presentationMode={presentationMode}
			shellWidth={shellWidth}
			allowedSnapStates={allowedSnapStates}
			topSlot={
				isCollapsed ? (
					<MapSearchCollapsedTopRow
						modalContainedStyle={modalContainedStyle}
						tokens={tokens}
						onExpand={() => handleSnapToggle(MAP_SHEET_SNAP_STATES.HALF)}
						onOpenProfile={onOpenProfile}
						profileImageSource={profileImageSource}
						isSignedIn={isSignedIn}
						isDarkMode={isDarkMode}
					/>
				) : (
					<MapSearchActiveTopRow
						modalContainedStyle={modalContainedStyle}
						searchInputRef={searchInputRef}
						model={model}
						snapState={snapState}
						handleExpand={() => handleSnapToggle(MAP_SHEET_SNAP_STATES.EXPANDED)}
						onSearchFocus={() => setIsSearchInputFocused(true)}
						onSearchBlur={() => setIsSearchInputFocused(false)}
						tokens={tokens}
						isDarkMode={isDarkMode}
					/>
				)
			}
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
					onScrollBeginDrag={handleAndroidCollapseScrollBeginDrag}
					onScroll={handleAndroidCollapseScroll}
					onScrollEndDrag={handleBodyScrollEndDrag}
					scrollEnabled={bodyScrollEnabled}
					androidExpandedBodyGesture={androidExpandedBodyGesture}
					androidExpandedBodyStyle={androidExpandedBodyStyle}
				>
					<MapSearchBodyContent model={model} />
				</MapStageBodyScroll>
			)}
		</MapSheetShell>
	);
}

export default function MapSearchStageBase(props) {
	return (
		<SearchBoundary>
			<MapSearchStageSurface {...props} />
		</SearchBoundary>
	);
}
