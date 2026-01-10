import { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import FullScreenEmergencyMap from "../map/FullScreenEmergencyMap";

export const EmergencyMapContainer = forwardRef((props, ref) => {
	const {
		hospitals,
		onHospitalSelect,
		onHospitalsGenerated,
		onMapReady,
		selectedHospitalId,
		routeHospitalId,
		animateAmbulance,
		ambulanceTripEtaSeconds,
		mode,
		showControls,
		bottomPadding,
		onRouteCalculated,
		responderLocation,
		responderHeading,
	} = props;

	return (
		<View style={styles.container}>
			<FullScreenEmergencyMap
				ref={ref}
				hospitals={hospitals}
				onHospitalSelect={onHospitalSelect}
				onHospitalsGenerated={onHospitalsGenerated}
				onMapReady={onMapReady}
				selectedHospitalId={selectedHospitalId}
				routeHospitalId={routeHospitalId}
				animateAmbulance={animateAmbulance}
				ambulanceTripEtaSeconds={ambulanceTripEtaSeconds}
				mode={mode}
				showControls={showControls}
				bottomPadding={bottomPadding}
				onRouteCalculated={onRouteCalculated}
				responderLocation={responderLocation}
				responderHeading={responderHeading}
			/>
		</View>
	);
});

EmergencyMapContainer.displayName = "EmergencyMapContainer";

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
