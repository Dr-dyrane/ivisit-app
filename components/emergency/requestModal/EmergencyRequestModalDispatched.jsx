import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

export default function EmergencyRequestModalDispatched({ requestData, textColor, mutedColor, cardColor }) {
	const isBed = requestData?.serviceType === "bed";
	return (
		<View style={styles.container}>
			<View style={styles.iconWrap}>
				<Ionicons name="checkmark-circle" size={56} color="#10B981" />
			</View>
			<Text style={[styles.title, { color: textColor }]}>
				{isBed ? "Bed Reserved" : "Service Dispatched"}
			</Text>
			<Text style={[styles.subtitle, { color: mutedColor }]}>
				{isBed ? "You're confirmed" : "Help is on the way"}
			</Text>

			<View style={[styles.card, { backgroundColor: cardColor }]}>
				<Row
					label={isBed ? "Reservation ID" : "Request ID"}
					value={requestData?.requestId ?? "--"}
					textColor={textColor}
					mutedColor={mutedColor}
				/>
				<Row
					label={isBed ? "Est. Wait" : "ETA"}
					value={requestData?.estimatedArrival ?? "--"}
					textColor={COLORS.brandPrimary}
					mutedColor={mutedColor}
				/>
				<Row label="Hospital" value={requestData?.hospitalName ?? "--"} textColor={textColor} mutedColor={mutedColor} />
				{isBed && (
					<Row
						label="Specialty"
						value={requestData?.specialty ?? "Any"}
						textColor={textColor}
						mutedColor={mutedColor}
					/>
				)}
			</View>
		</View>
	);
}

function Row({ label, value, textColor, mutedColor }) {
	return (
		<View style={styles.row}>
			<Text style={[styles.label, { color: mutedColor }]}>{label}:</Text>
			<Text style={[styles.value, { color: textColor }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 30,
		alignItems: "center",
	},
	iconWrap: {
		marginBottom: 14,
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.4,
	},
	subtitle: {
		fontSize: 14,
		fontWeight: "600",
		marginTop: 6,
		marginBottom: 18,
	},
	card: {
		width: "100%",
		padding: 16,
		borderRadius: 18,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	label: {
		fontSize: 13,
		fontWeight: "700",
	},
	value: {
		fontSize: 13,
		fontWeight: "800",
	},
});
