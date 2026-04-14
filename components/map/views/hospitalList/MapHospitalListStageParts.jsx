import React from "react";
import { Text, View } from "react-native";
import MapHospitalListContent from "../../surfaces/hospitals/MapHospitalListContent";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import styles from "./mapHospitalListStage.styles";

export function MapHospitalListTopSlot({
	modalContainedStyle,
	titleColor,
	closeSurfaceColor,
	isDarkMode,
	onClose,
}) {
	return (
		<View style={[styles.headerRow, modalContainedStyle]}>
			<View style={styles.headerCopy}>
				<Text style={[styles.title, { color: titleColor }]}>Hospitals</Text>
			</View>
			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close hospitals"
				backgroundColor={closeSurfaceColor}
				color={titleColor}
				style={styles.closeButton}
			/>
		</View>
	);
}

export function MapHospitalListBodyContent({
	hospitals,
	selectedHospitalId,
	recommendedHospitalId,
	onSelectHospital,
	onChangeLocation,
	isLoading,
}) {
	return (
		<MapHospitalListContent
			hospitals={hospitals}
			selectedHospitalId={selectedHospitalId}
			recommendedHospitalId={recommendedHospitalId}
			onSelectHospital={onSelectHospital}
			onChangeLocation={onChangeLocation}
			isLoading={isLoading}
		/>
	);
}
