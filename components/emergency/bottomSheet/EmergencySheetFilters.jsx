import React from "react";
import { View } from "react-native";
import ServiceTypeSelector from "../ServiceTypeSelector";
import SpecialtySelector from "../SpecialtySelector";

export default function EmergencySheetFilters({
	visible,
	mode,
	serviceType,
	selectedSpecialty,
	specialties,
	serviceTypeCounts,
	specialtyCounts,
	onServiceTypeSelect,
	onSpecialtySelect,
	styles,
	hospitals = [],
}) {
	if (!visible) return null;

	return (
		<View style={styles.selectorContainer}>
			{mode === "emergency" ? (
				<ServiceTypeSelector
					selectedType={serviceType}
					onSelect={onServiceTypeSelect}
					counts={serviceTypeCounts}
					hospitals={hospitals}
				/>
			) : (
				<SpecialtySelector
					specialties={specialties}
					selectedSpecialty={selectedSpecialty}
					onSelect={onSpecialtySelect}
					counts={specialtyCounts}
				/>
			)}
		</View>
	);
}

