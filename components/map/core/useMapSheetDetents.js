import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { getMapPlatformMotion } from "../tokens/mapMotionTokens";
import {
	getAllowedMapSheetSnapStates,
	getNextAllowedMapSheetSnapStateDown,
	getNextAllowedMapSheetSnapStateUp,
	getToggledMapSheetSnapState,
	MAP_SHEET_SNAP_STATES,
} from "./mapSheet.constants";

export default function useMapSheetDetents({
	snapState,
	onSnapStateChange,
	presentationMode = "sheet",
	allowedSnapStates,
	extraScrollEnabled = false,
	preventCollapse = false,
}) {
	const platformMotion = useMemo(() => getMapPlatformMotion(Platform.OS), []);
	const sheetScrollMotion = platformMotion.sheet.scroll;
	const isWebPlatform = Platform.OS === "web";
	const isSidebarPresentation = presentationMode === "sidebar";
	const orderedSnapStates = useMemo(
		() => getAllowedMapSheetSnapStates(allowedSnapStates),
		[allowedSnapStates],
	);
	const canExpand =
		getNextAllowedMapSheetSnapStateUp(snapState, orderedSnapStates) !== snapState;
	const canCollapse =
		!preventCollapse &&
		getNextAllowedMapSheetSnapStateDown(snapState, orderedSnapStates) !== snapState;
	const allowScrollDetents =
		!isSidebarPresentation && Boolean(sheetScrollMotion.enableContentDetents);
	const allowWheelDetents =
		!isSidebarPresentation &&
		isWebPlatform &&
		Boolean(sheetScrollMotion.enableWheelDetents);
	const bodyScrollRef = useRef(null);
	const scrollStartOffsetYRef = useRef(0);
	const lastScrollOffsetYRef = useRef(0);
	const maxScrollOffsetYRef = useRef(0);
	const minScrollOffsetYRef = useRef(0);
	const scrollSnapHandledRef = useRef(false);
	const wheelSnapAccumRef = useRef(0);
	const lastWheelSnapAtRef = useRef(0);
	const contentHeightRef = useRef(0);
	const layoutHeightRef = useRef(0);
	const topThreshold = sheetScrollMotion.topThreshold;
	const expandOffset = sheetScrollMotion.expandOffset;
	const expandCommitOffset =
		sheetScrollMotion.expandCommitOffset || Math.max(expandOffset + 20, expandOffset);
	const collapsePull = sheetScrollMotion.collapsePull;
	const collapseCommitPull =
		sheetScrollMotion.collapseCommitPull || Math.min(collapsePull - 12, collapsePull);
	const expandVelocity = sheetScrollMotion.expandVelocity;
	const collapseVelocity = sheetScrollMotion.collapseVelocity;
	const halfCollapseExtraPull = sheetScrollMotion.halfCollapseExtraPull;
	const halfCollapseVelocityFactor = sheetScrollMotion.halfCollapseVelocityFactor;
	const expandedCollapseWheelThreshold =
		sheetScrollMotion.expandedCollapseWheelThreshold || -72;
	const halfCollapseWheelThreshold = sheetScrollMotion.halfCollapseWheelThreshold;
	const wheelCooldownMs = sheetScrollMotion.wheelCooldownMs || 0;
	const isExpanded = snapState === MAP_SHEET_SNAP_STATES.EXPANDED;

	useEffect(() => {
		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
		scrollStartOffsetYRef.current = 0;
		lastScrollOffsetYRef.current = 0;
		maxScrollOffsetYRef.current = 0;
		minScrollOffsetYRef.current = 0;
	}, [snapState]);

	useEffect(() => {
		if (snapState !== MAP_SHEET_SNAP_STATES.EXPANDED || isSidebarPresentation) return;
		requestAnimationFrame(() => {
			bodyScrollRef.current?.scrollTo?.({ y: 0, animated: false });
			lastScrollOffsetYRef.current = 0;
		});
	}, [isSidebarPresentation, snapState]);

	const triggerScrollSnap = useCallback(
		(nextState) => {
			if (
				isSidebarPresentation ||
				typeof onSnapStateChange !== "function" ||
				!nextState ||
				nextState === snapState ||
				scrollSnapHandledRef.current
			) {
				return;
			}

			scrollSnapHandledRef.current = true;
			wheelSnapAccumRef.current = 0;
			scrollStartOffsetYRef.current = 0;
			lastScrollOffsetYRef.current = 0;
			maxScrollOffsetYRef.current = 0;
			minScrollOffsetYRef.current = 0;
			bodyScrollRef.current?.scrollTo?.({ y: 0, animated: false });
			onSnapStateChange(nextState);
		},
		[isSidebarPresentation, onSnapStateChange, snapState],
	);

	const handleSnapToggle = useCallback(
		(nextState = null) => {
			if (typeof onSnapStateChange !== "function") return;
			if (nextState) {
				if (orderedSnapStates.includes(nextState)) {
					onSnapStateChange(nextState);
				}
				return;
			}
			onSnapStateChange(getToggledMapSheetSnapState(snapState, orderedSnapStates));
		},
		[onSnapStateChange, orderedSnapStates, snapState],
	);

	const handleBodyScrollBeginDrag = useCallback((event) => {
		const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
		scrollStartOffsetYRef.current = offsetY;
		lastScrollOffsetYRef.current = offsetY;
		maxScrollOffsetYRef.current = offsetY;
		minScrollOffsetYRef.current = offsetY;
		scrollSnapHandledRef.current = false;
		wheelSnapAccumRef.current = 0;
	}, []);

	const handleBodyScroll = useCallback(
		(event) => {
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
			lastScrollOffsetYRef.current = offsetY;
			maxScrollOffsetYRef.current = Math.max(maxScrollOffsetYRef.current, offsetY);
			minScrollOffsetYRef.current = Math.min(minScrollOffsetYRef.current, offsetY);
			const contentH = event?.nativeEvent?.contentSize?.height;
			const layoutH = event?.nativeEvent?.layoutMeasurement?.height;
			if (contentH > 0) contentHeightRef.current = contentH;
			if (layoutH > 0) layoutHeightRef.current = layoutH;
			if (offsetY > topThreshold) {
				wheelSnapAccumRef.current = 0;
			}

			// Intentionally do not snap mid-scroll. Native iOS sheets can expand
			// while content is scrolled at the edge, but our custom detent shell
			// felt too eager when we committed on raw offset alone. We arm the
			// detent here and commit on release instead.
			if (isSidebarPresentation || !allowScrollDetents || scrollSnapHandledRef.current) return;
		},
		[allowScrollDetents, isSidebarPresentation, topThreshold],
	);

	const handleBodyScrollEndDrag = useCallback(
		(event) => {
			const offsetY = event?.nativeEvent?.contentOffset?.y ?? lastScrollOffsetYRef.current ?? 0;
			const velocityY = event?.nativeEvent?.velocity?.y ?? 0;
			const peakOffsetY = Math.max(maxScrollOffsetYRef.current, offsetY);
			const peakPullOffsetY = Math.min(minScrollOffsetYRef.current, offsetY);
			const dragAdvance = peakOffsetY - scrollStartOffsetYRef.current;
			const releasedNearTop = offsetY <= topThreshold;
			const strongExpand = dragAdvance >= expandCommitOffset;
			const velocityExpand = dragAdvance >= expandOffset && velocityY > expandVelocity;
			const strongCollapse = peakPullOffsetY <= collapseCommitPull;
			const velocityCollapse = releasedNearTop && velocityY < collapseVelocity;
			const nextDownState = getNextAllowedMapSheetSnapStateDown(
				snapState,
				orderedSnapStates,
			);
			lastScrollOffsetYRef.current = offsetY;

			if (isSidebarPresentation || !allowScrollDetents || scrollSnapHandledRef.current) return;
			const startedNearTop = scrollStartOffsetYRef.current <= topThreshold;

			// Expand when user scrolls to bottom of content while sheet is HALF.
			// Requires meaningful content (>80px scrollable) and user actually scrolled
			// at least 40px so a short tap-release doesn't fire this.
			const contentH = contentHeightRef.current;
			const layoutH = layoutHeightRef.current;
			const hasScrollableContent = contentH > 0 && layoutH > 0 && contentH > layoutH + 80;
			const isAtBottom = hasScrollableContent && offsetY + layoutH >= contentH - 4;
			const scrolledEnough = peakOffsetY - scrollStartOffsetYRef.current >= 40;
			if (
				snapState === MAP_SHEET_SNAP_STATES.HALF &&
				canExpand &&
				isAtBottom &&
				scrolledEnough &&
				!scrollSnapHandledRef.current
			) {
				triggerScrollSnap(getNextAllowedMapSheetSnapStateUp(snapState, orderedSnapStates));
				return;
			}

			if (!startedNearTop) return;

			if (snapState === MAP_SHEET_SNAP_STATES.HALF && canExpand && (strongExpand || velocityExpand)) {
				triggerScrollSnap(
					getNextAllowedMapSheetSnapStateUp(snapState, orderedSnapStates),
				);
				return;
			}

			if (canCollapse && (strongCollapse || velocityCollapse)) {
				if (snapState === MAP_SHEET_SNAP_STATES.EXPANDED) {
					triggerScrollSnap(nextDownState);
					return;
				}
				if (
					snapState === MAP_SHEET_SNAP_STATES.HALF &&
					(
						peakPullOffsetY <= collapseCommitPull - halfCollapseExtraPull ||
						velocityY < collapseVelocity * halfCollapseVelocityFactor
					)
				) {
					triggerScrollSnap(nextDownState);
				}
			}
		},
		[
			allowScrollDetents,
			canCollapse,
			canExpand,
			collapseCommitPull,
			collapseVelocity,
			expandOffset,
			expandCommitOffset,
			expandVelocity,
			halfCollapseVelocityFactor,
			isSidebarPresentation,
			orderedSnapStates,
			snapState,
			topThreshold,
			triggerScrollSnap,
		],
	);

	const handleBodyWheel = useCallback(
		(event) => {
			if (
				isSidebarPresentation ||
				!allowWheelDetents ||
				scrollSnapHandledRef.current ||
				!isWebPlatform
			) {
				return;
			}

			const deltaY = Number(event?.nativeEvent?.deltaY ?? 0);
			if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 1) return;
			const now = Date.now();
			if (wheelCooldownMs > 0 && now - lastWheelSnapAtRef.current < wheelCooldownMs) {
				return;
			}

			const isAtTop = lastScrollOffsetYRef.current <= topThreshold;
			if (!isAtTop) {
				wheelSnapAccumRef.current = 0;
				return;
			}

			wheelSnapAccumRef.current =
				Math.sign(wheelSnapAccumRef.current) === Math.sign(deltaY) ||
				wheelSnapAccumRef.current === 0
					? wheelSnapAccumRef.current + deltaY
					: deltaY;

			// Collapse: scroll down (negative deltaY accumulation)
			if (
				snapState === MAP_SHEET_SNAP_STATES.EXPANDED &&
				canCollapse &&
				wheelSnapAccumRef.current <= expandedCollapseWheelThreshold
			) {
				lastWheelSnapAtRef.current = now;
				triggerScrollSnap(
					getNextAllowedMapSheetSnapStateDown(snapState, orderedSnapStates),
				);
				return;
			}

			if (
				snapState === MAP_SHEET_SNAP_STATES.HALF &&
				canCollapse &&
				wheelSnapAccumRef.current <= halfCollapseWheelThreshold
			) {
				lastWheelSnapAtRef.current = now;
				triggerScrollSnap(
					getNextAllowedMapSheetSnapStateDown(snapState, orderedSnapStates),
				);
				return;
			}

			// Expand: scroll up (positive deltaY accumulation)
			if (
				snapState === MAP_SHEET_SNAP_STATES.HALF &&
				canExpand &&
				wheelSnapAccumRef.current >= Math.abs(halfCollapseWheelThreshold)
			) {
				lastWheelSnapAtRef.current = now;
				triggerScrollSnap(
					getNextAllowedMapSheetSnapStateUp(snapState, orderedSnapStates),
				);
				return;
			}

			if (
				snapState === MAP_SHEET_SNAP_STATES.COLLAPSED &&
				canExpand &&
				wheelSnapAccumRef.current >= Math.abs(expandedCollapseWheelThreshold)
			) {
				lastWheelSnapAtRef.current = now;
				triggerScrollSnap(
					getNextAllowedMapSheetSnapStateUp(snapState, orderedSnapStates),
				);
			}
		},
		[
			allowWheelDetents,
			canCollapse,
			canExpand,
			expandedCollapseWheelThreshold,
			halfCollapseWheelThreshold,
			isSidebarPresentation,
			isWebPlatform,
			orderedSnapStates,
			snapState,
			topThreshold,
			triggerScrollSnap,
			wheelCooldownMs,
		],
	);

	// Scroll is always enabled — detents fire on release, not during scroll,
	// so content browsing and sheet snapping do not fight each other.
	const bodyScrollEnabled = true;

	return {
		allowScrollDetents,
		allowWheelDetents,
		bodyScrollEnabled,
		bodyScrollRef,
		handleBodyScroll,
		handleBodyScrollBeginDrag,
		handleBodyScrollEndDrag,
		handleBodyWheel: isWebPlatform ? handleBodyWheel : undefined,
		handleSnapToggle,
		isSidebarPresentation,
		orderedSnapStates,
	};
}
