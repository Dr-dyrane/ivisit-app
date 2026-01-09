import React from "react";
import HospitalCard from "../HospitalCard";
import Call911Card from "../Call911Card";

export default function EmergencySheetHospitalList({
	visible,
	hospitals,
	selectedHospitalId,
	onHospitalSelect,
	onHospitalCall,
	mode,
}) {
	if (!visible) return null;

	return hospitals.length > 0 ? (
		hospitals
			.filter((h) => h?.id)
			.map((hospital) => (
				<HospitalCard
					key={hospital.id}
					hospital={hospital}
					isSelected={selectedHospitalId === hospital.id}
					onSelect={() => onHospitalSelect(hospital)}
					onCall={() => onHospitalCall(hospital.id)}
					mode={mode}
				/>
			))
	) : (
		<Call911Card
			message={
				mode === "emergency"
					? "No ambulance services found nearby. For immediate assistance, call 911."
					: "No hospitals with available beds found. For urgent care, call 911."
			}
		/>
	);
}

