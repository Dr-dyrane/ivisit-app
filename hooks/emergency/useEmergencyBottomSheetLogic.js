import {
	useCallback,
	useMemo,
	useState,
	useRef,
	useEffect,
} from "react";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { useBottomSheetSnap } from "../../hooks/emergency/useBottomSheetSnap";
import { useBottomSheetScroll } from "../../hooks/emergency/useBottomSheetScroll";
import { useBottomSheetSearch } from "../../hooks/emergency/useBottomSheetSearch";

export const useEmergencyBottomSheetLogic = ({
	mode,
	selectedHospital,
	activeAmbulanceTrip,
	activeBedBooking,
	onSnapChange,
	onSearch,
}) => {
	const { snapIndex: newSnapIndex, resetSnapIndex, showProfileModal, openProfileModal, closeProfileModal, searchQuery: localSearchQuery, timing, clearSearch } = useEmergencyUI();

	const [sheetPhase, setSheetPhase] = useState("half");

	const isDetailMode = !!selectedHospital;
	const hasAnyVisitActive = !!activeAmbulanceTrip || !!activeBedBooking;
	const isTripMode = mode === "emergency" && !!activeAmbulanceTrip?.requestId;
	const isBedBookingMode = mode === "booking" && !!activeBedBooking?.requestId;

	const bottomSheetRef = useRef(null);
	const listScrollRef = useRef(null);

	// Reset snap index when entering detail mode
	useEffect(() => {
		if (isDetailMode && newSnapIndex > 0) {
			resetSnapIndex();
		}
	}, [isDetailMode, newSnapIndex, resetSnapIndex]);

	const { snapPoints, animationConfigs, currentSnapIndex, handleSheetChange } =
		useBottomSheetSnap({
			isDetailMode,
			isTripMode,
			isBedBookingMode,
			hasAnyVisitActive,
			onSnapChange,
			mode,
			activeAmbulanceTrip,
			activeBedBooking,
		});

	const { handleScroll } = useBottomSheetScroll({ currentSnapIndex, snapPoints });

	const { handleSearchChange, handleSearchFocus, handleSearchBlur, handleSearchClear } =
		useBottomSheetSearch({
			onSearch,
			sheetRef: bottomSheetRef,
		});

	const handleAvatarPress = useCallback(() => {
		timing.startTiming("avatar_press");
		openProfileModal();
		timing.endTiming("avatar_press");
	}, [openProfileModal, timing]);

	const clampSheetIndex = useCallback(
		(index) => {
			if (!Number.isFinite(index)) return 0;
			if (!snapPoints || snapPoints.length === 0) return 0;
			const maxIndex = snapPoints.length - 1;
			return Math.min(Math.max(index, 0), maxIndex);
		},
		[snapPoints]
	);

	const snapToIndex = useCallback((index) => {
		const clampedIndex = clampSheetIndex(index);
		if (bottomSheetRef.current && snapPoints.length > 0) {
			return bottomSheetRef.current.snapToIndex(clampedIndex);
		}
		return null;
	}, [clampSheetIndex, snapPoints]);

	const expand = useCallback(() => bottomSheetRef.current?.expand(), []);
	const collapse = useCallback(() => bottomSheetRef.current?.collapse(), []);
	const getCurrentSnapIndex = useCallback(() => currentSnapIndex, [currentSnapIndex]);
	const scrollTo = useCallback((y, animated = true) => listScrollRef.current?.scrollTo?.({ y, animated }), []);
	
	const restoreListState = useCallback((state = {}) => {
		const snapIndex = state?.snapIndex;
		const scrollY = state?.scrollY;
		setTimeout(() => {
			if (typeof snapIndex === "number") {
				const safeIndex = clampSheetIndex(snapIndex);
				const finalIndex = isDetailMode ? 0 : safeIndex;
				bottomSheetRef.current?.snapToIndex(finalIndex);
			}
			if (typeof scrollY === "number") {
				listScrollRef.current?.scrollTo?.({ y: scrollY, animated: false });
			}
		}, 100);
	}, [clampSheetIndex, isDetailMode]);

	// Stability Sync
	useEffect(() => {
		if (!bottomSheetRef.current || snapPoints.length === 0) return;
		const maxIdx = snapPoints.length - 1;
		let targetIdx = newSnapIndex;
		if (isDetailMode) {
			targetIdx = 0;
		} else if (hasAnyVisitActive && snapPoints.length === 1) {
			targetIdx = 0;
		} else {
			targetIdx = Math.min(Math.max(0, newSnapIndex), maxIdx);
		}

		if (currentSnapIndex === targetIdx) return;

		const timer = setTimeout(() => {
			try {
				if (bottomSheetRef.current) {
					bottomSheetRef.current.snapToIndex(targetIdx);
				}
			} catch (error) {
				console.warn('[EmergencyBottomSheet] Safe snap failed:', error?.message);
			}
		}, 1);
		return () => clearTimeout(timer);
	}, [newSnapIndex, snapPoints.length, isDetailMode, hasAnyVisitActive, currentSnapIndex, mode]);

	// Derived Index
	const derivedIndex = useMemo(() => {
		const maxIdx = Math.max(0, snapPoints.length - 1);
		if (isDetailMode || snapPoints.length <= 1) return 0;
		if (hasAnyVisitActive && snapPoints.length === 2) return Math.min(newSnapIndex, 1);
		return Math.min(Math.max(0, newSnapIndex), maxIdx);
	}, [isDetailMode, hasAnyVisitActive, newSnapIndex, snapPoints.length, snapPoints]);

	// Phase Tracking
	useEffect(() => {
		if (snapPoints.length <= 1) {
			setSheetPhase("half");
			return;
		}
		if (snapPoints.length === 2) {
			const phase = (currentSnapIndex || 0) <= 0 ? "collapsed" : "full";
			setSheetPhase(phase);
			return;
		}
		const phase = (currentSnapIndex || 0) <= 0 ? "collapsed" : (currentSnapIndex || 0) === 1 ? "half" : "full";
		setSheetPhase(phase);
	}, [currentSnapIndex, snapPoints.length, isDetailMode]);

    const isBelowHalf = sheetPhase === "collapsed" || (sheetPhase === "half" && newSnapIndex === 0);
    const isFloating = newSnapIndex === 0 || newSnapIndex === 1;

	return {
		state: {
			bottomSheetRef,
			listScrollRef,
			snapPoints,
			derivedIndex,
			sheetPhase,
			localSearchQuery,
			showProfileModal,
			isDetailMode,
			isTripMode,
			isBedBookingMode,
			hasAnyVisitActive,
            isBelowHalf,
            isFloating,
            animationConfigs
		},
		actions: {
			handleSheetChange,
			handleScroll,
			handleSearchChange,
			handleSearchFocus,
			handleSearchBlur,
			handleSearchClear,
			handleAvatarPress,
			snapToIndex,
			expand,
			collapse,
			getCurrentSnapIndex,
			scrollTo,
			restoreListState,
			openProfileModal,
			closeProfileModal,
            clearSearch
		},
	};
};
