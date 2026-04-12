import React, { useEffect, useState } from "react";
import { SearchBoundary } from "../../../../contexts/SearchContext";
import EmergencySearchBar from "../../../emergency/EmergencySearchBar";
import MapModalShell from "../MapModalShell";
import { MAP_SEARCH_SHEET_MODES } from "./mapSearchSheet.helpers";
import MapSearchSheetSections from "./MapSearchSheetSections";
import useMapSearchSheetModel from "./useMapSearchSheetModel";
import { styles } from "./mapSearchSheet.styles";

function MapSearchSheetContent({
	visible,
	onClose,
	mode = MAP_SEARCH_SHEET_MODES.SEARCH,
	hospitals = [],
	selectedHospitalId = null,
	currentLocation = null,
	onOpenHospital,
	onBrowseHospitals,
	onUseCurrentLocation,
	onSelectLocation,
}) {
	const model = useMapSearchSheetModel({
		visible,
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

	return (
		<MapModalShell
			visible={visible}
			onClose={model.handleDismiss}
			title="Search"
			minHeightRatio={0.82}
			contentContainerStyle={styles.content}
		>
			<EmergencySearchBar
				value={model.query}
				onChangeText={model.setSearchQuery}
				onBlur={() => model.commitQuery(model.query)}
				onClear={() => model.setSearchQuery("")}
				placeholder="Search hospitals, specialties, or area"
				showSuggestions={false}
				autoFocus={visible}
				style={styles.searchBar}
			/>
			<MapSearchSheetSections model={model} />
		</MapModalShell>
	);
}

export default function MapSearchSheet(props) {
	const [hasOpened, setHasOpened] = useState(Boolean(props?.visible));

	useEffect(() => {
		if (props?.visible) {
			setHasOpened(true);
		}
	}, [props?.visible]);

	if (!hasOpened && !props?.visible) {
		return null;
	}

	return (
		<SearchBoundary>
			<MapSearchSheetContent {...props} />
		</SearchBoundary>
	);
}
