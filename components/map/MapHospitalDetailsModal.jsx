import React from "react";
import MapModalShell from "./surfaces/MapModalShell";
import MapHospitalDetailBody from "./surfaces/hospitals/MapHospitalDetailBody";
import { styles } from "./surfaces/hospitals/mapHospitalDetail.styles";
import useMapHospitalDetailModel from "./surfaces/hospitals/useMapHospitalDetailModel";

export default function MapHospitalDetailsModal(props) {
	const model = useMapHospitalDetailModel(props);

	return (
		<MapModalShell
			visible={props.visible}
			onClose={props.onClose}
			title={null}
			minHeightRatio={0.88}
			maxHeightRatio={0.88}
			contentContainerStyle={styles.content}
			scrollEnabled={true}
			showHandle={true}
		>
			<MapHospitalDetailBody model={model} visible={props.visible} />
		</MapModalShell>
	);
}
