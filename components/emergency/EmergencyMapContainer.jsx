import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import FullScreenEmergencyMap from "../map/FullScreenEmergencyMap";

export const EmergencyMapContainer = forwardRef((props, ref) => {
	const containerId = useRef(Math.random().toString(36).substr(2, 9));
	console.log(`[EmergencyMapContainer-${containerId.current}] Component mounting...`);
	
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
		sheetSnapIndex,
		mapStateKey,
	} = props;

	const baseMapRef = useRef(null);
	const routeMapRef = useRef(null);
	const showRouteMap = !!routeHospitalId;
	const activeRef = showRouteMap ? routeMapRef : baseMapRef;
	const routeInstanceKey = useMemo(() => {
		const keyBase = typeof mapStateKey === "string" ? mapStateKey : "emergency";
		const key = showRouteMap
			? `route:${keyBase}:${String(routeHospitalId)}`
			: `base:${keyBase}`;
		console.log(`[EmergencyMapContainer-${containerId.current}] routeInstanceKey:`, key);
		return key;
	}, [mapStateKey, routeHospitalId, showRouteMap]); // Removed 'mode' to prevent new instances on mode toggle

	useImperativeHandle(ref, () => ({
		animateToHospital: (hospital, options) => {
			activeRef.current?.animateToHospital?.(hospital, options);
		},
		fitToAllHospitals: () => {
			activeRef.current?.fitToAllHospitals?.();
		},
	}));

	useEffect(() => {
		if (!showRouteMap) return;
		if (!selectedHospitalId) return;
		if (!routeMapRef.current) return;
		if (!Array.isArray(hospitals) || hospitals.length === 0) return;

		const hospital = hospitals.find((h) => h?.id === selectedHospitalId) ?? null;
		if (!hospital) return;

		if (__DEV__) {
			console.log("[EmergencyMapContainer] route map mount focus", {
				selectedHospitalId,
				routeHospitalId,
				bottomPadding,
			});
		}

		routeMapRef.current.animateToHospital?.(hospital, {
			includeUser: true,
			bottomPadding: bottomPadding,
		});
	}, [bottomPadding, hospitals, selectedHospitalId, showRouteMap]);

	return (
		<View style={styles.container}>
			{showRouteMap ? (
				<FullScreenEmergencyMap
					key={routeInstanceKey}
					ref={routeMapRef}
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
					sheetSnapIndex={sheetSnapIndex}
					mapStateKey={mapStateKey}
				/>
			) : (
				<FullScreenEmergencyMap
					key={routeInstanceKey}
					ref={baseMapRef}
					hospitals={hospitals}
					onHospitalSelect={onHospitalSelect}
					onHospitalsGenerated={onHospitalsGenerated}
					onMapReady={onMapReady}
					selectedHospitalId={selectedHospitalId}
					routeHospitalId={null}
					animateAmbulance={false}
					ambulanceTripEtaSeconds={null}
					mode={mode}
					showControls={showControls}
					bottomPadding={bottomPadding}
					onRouteCalculated={undefined}
					responderLocation={null}
					responderHeading={null}
					sheetSnapIndex={sheetSnapIndex}
					mapStateKey={mapStateKey}
				/>
			)}
		</View>
	);
});

EmergencyMapContainer.displayName = "EmergencyMapContainer";

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
