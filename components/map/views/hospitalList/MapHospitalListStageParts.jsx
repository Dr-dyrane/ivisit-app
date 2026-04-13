import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapHospitalListContent from "../../surfaces/hospitals/MapHospitalListContent";
import styles from "./mapHospitalListStage.styles";

export function MapHospitalListTopSlot({
	modalContainedStyle,
	titleColor,
	closeSurfaceColor,
	onClose,
}) {
	return (
		<View style={[styles.headerRow, modalContainedStyle]}>
			<View style={styles.headerCopy}>
				<Text style={[styles.title, { color: titleColor }]}>Hospitals</Text>
			</View>
			<Pressable
				onPress={onClose}
				accessibilityRole="button"
				accessibilityLabel="Close hospitals"
				style={[styles.closeButton, { backgroundColor: closeSurfaceColor }]}
			>
				<Ionicons name="close" size={20} color={titleColor} />
			</Pressable>
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
