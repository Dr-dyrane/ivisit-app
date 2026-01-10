import { useCallback } from "react";
import { Keyboard } from "react-native";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";

export const useBottomSheetSearch = ({ onSearch, sheetRef } = {}) => {
	const { updateSearch, clearSearch } = useEmergencyUI();
	const { lockHeaderHidden, unlockHeaderHidden, hideHeader, showHeader } =
		useScrollAwareHeader();

	const handleSearchChange = useCallback(
		(text) => {
			updateSearch(text);
			if (onSearch) onSearch(text);
		},
		[onSearch, updateSearch]
	);

	const handleSearchFocus = useCallback(() => {
		lockHeaderHidden();
		hideHeader();
		sheetRef?.current?.snapToIndex?.(2);
	}, [hideHeader, lockHeaderHidden, sheetRef]);

	const handleSearchBlur = useCallback(() => {
		unlockHeaderHidden();
		showHeader();
	}, [showHeader, unlockHeaderHidden]);

	const handleSearchClear = useCallback(() => {
		clearSearch();
		if (onSearch) onSearch("");
		Keyboard.dismiss();
	}, [onSearch, clearSearch]);

	return {
		handleSearchChange,
		handleSearchFocus,
		handleSearchBlur,
		handleSearchClear,
	};
};
