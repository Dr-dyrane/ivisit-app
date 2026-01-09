import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Fontisto } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

export default function BedBookingSummaryCard({
	hospitalName,
	selectedSpecialty,
	availableBeds,
	waitTime,
	textColor,
	mutedColor,
	cardColor,
}) {
	return (
		<View style={[styles.card, { backgroundColor: cardColor }]}>
			<View style={styles.row}>
				<Fontisto name="bed-patient" size={16} color={COLORS.brandPrimary} />
				<Text style={[styles.title, { color: textColor }]}>Bed Reservation</Text>
			</View>

			<View style={styles.kvRow}>
				<Text style={[styles.k, { color: mutedColor }]}>Hospital</Text>
				<Text style={[styles.v, { color: textColor }]} numberOfLines={1}>
					{hospitalName}
				</Text>
			</View>

			<View style={styles.kvRow}>
				<Text style={[styles.k, { color: mutedColor }]}>Specialty</Text>
				<Text style={[styles.v, { color: textColor }]}>
					{selectedSpecialty ?? "Any"}
				</Text>
			</View>

			<View style={styles.kvRow}>
				<Text style={[styles.k, { color: mutedColor }]}>Available</Text>
				<Text style={[styles.v, { color: textColor }]}>
					{Number.isFinite(availableBeds) ? `${availableBeds} beds` : "--"}
				</Text>
			</View>

			<View style={styles.kvRow}>
				<Text style={[styles.k, { color: mutedColor }]}>Est. Wait</Text>
				<Text style={[styles.v, { color: textColor }]}>{waitTime ?? "--"}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 18,
		padding: 16,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	title: {
		marginLeft: 10,
		fontSize: 14,
		fontWeight: "900",
		letterSpacing: 0.6,
	},
	kvRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 10,
	},
	k: {
		fontSize: 12,
		fontWeight: "800",
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
	v: {
		flex: 1,
		marginLeft: 12,
		textAlign: "right",
		fontSize: 13,
		fontWeight: "800",
	},
});
