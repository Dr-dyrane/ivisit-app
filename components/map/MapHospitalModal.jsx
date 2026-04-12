import React from "react";
import MapModalShell from "./surfaces/MapModalShell";
import MapHospitalListContent from "./surfaces/hospitals/MapHospitalListContent";
import { styles } from "./surfaces/hospitals/mapHospitalList.styles";

export default function MapHospitalModal({
	visible,
	onClose,
	hospitals = [],
	selectedHospitalId = null,
	recommendedHospitalId = null,
	onSelectHospital,
	onChangeLocation,
	isLoading = false,
}) {
	return (
		<MapModalShell
			visible={visible}
			onClose={onClose}
			title="Hospitals"
			minHeightRatio={0.78}
			contentContainerStyle={styles.content}
		>
			<MapHospitalListContent
				hospitals={hospitals}
				selectedHospitalId={selectedHospitalId}
				recommendedHospitalId={recommendedHospitalId}
				onSelectHospital={onSelectHospital}
				onChangeLocation={onChangeLocation}
				isLoading={isLoading}
			/>
		</MapModalShell>
	);
}
