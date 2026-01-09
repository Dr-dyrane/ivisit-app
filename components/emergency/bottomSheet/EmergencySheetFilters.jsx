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
}) {
	if (!visible) return null;

	return (
		<View style={styles.selectorContainer}>
			{mode === "emergency" ? (
				<ServiceTypeSelector
					selectedType={serviceType}
					onSelect={onServiceTypeSelect}
					counts={serviceTypeCounts}
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

