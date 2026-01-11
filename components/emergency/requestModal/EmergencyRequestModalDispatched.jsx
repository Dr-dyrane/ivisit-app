import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { COLORS } from "../../../constants/colors";
import InfoTile from "./InfoTile";

export default function EmergencyRequestModalDispatched({ requestData, textColor, mutedColor, cardColor }) {
	const isBed = requestData?.serviceType === "bed";
	const bedNumber = requestData?.bedNumber ?? (isBed ? `B-${Math.floor(Math.random() * 90) + 10}` : null);
	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: textColor }]}>
				{isBed ? "Bed Reserved" : "Service Dispatched"}
			</Text>
			<Text style={[styles.subtitle, { color: mutedColor }]}>
				{isBed ? "You're confirmed" : "Help is on the way"}
			</Text>

			{isBed ? (
				<View style={styles.grid}>
					<InfoTile
						label="Reservation"
						value={requestData?.requestId ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
					/>
					<InfoTile
						label="Bed Number"
						value={bedNumber ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
					/>
					<InfoTile
						label="Beds"
						value={
							Number.isFinite(requestData?.bedCount)
								? String(requestData.bedCount)
								: requestData?.bedCount ?? "1"
						}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
					/>
					<InfoTile
						label="Est. Wait"
						value={requestData?.estimatedArrival ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
						valueColor={COLORS.brandPrimary}
					/>
					<View style={[styles.wideCard, { backgroundColor: cardColor }]}>
						<Text style={[styles.wideLabel, { color: mutedColor }]}>Hospital</Text>
						<Text style={[styles.wideValue, { color: textColor }]} numberOfLines={2}>
							{requestData?.hospitalName ?? "--"}
						</Text>
						<Text style={[styles.wideSubValue, { color: mutedColor }]} numberOfLines={1}>
							{requestData?.specialty ? `Specialty: ${requestData.specialty}` : "Specialty: Any"}
						</Text>
					</View>
				</View>
			) : (
				<View style={styles.grid}>
					<InfoTile
						label="Request"
						value={requestData?.requestId ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
					/>
					<InfoTile
						label="ETA"
						value={requestData?.estimatedArrival ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
						valueColor={COLORS.brandPrimary}
					/>
					<InfoTile
						label="Ambulance"
						value={
							requestData?.ambulanceType?.name || 
							requestData?.ambulanceType?.title || 
							"Ambulance"
						}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
					/>
					<InfoTile
						label="Status"
						value="En Route"
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
					/>
					<View style={[styles.wideCard, { backgroundColor: cardColor }]}>
						<Text style={[styles.wideLabel, { color: mutedColor }]}>Hospital</Text>
						<Text style={[styles.wideValue, { color: textColor }]} numberOfLines={2}>
							{requestData?.hospitalName ?? "--"}
						</Text>
						<Text style={[styles.wideSubValue, { color: mutedColor }]} numberOfLines={1}>
							{requestData?.ambulanceType
								? `Type: ${requestData.ambulanceType?.name || requestData.ambulanceType?.title || "Ambulance"}`
								: "Type: --"}
						</Text>
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 40,
		alignItems: "center",
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.4,
	},
	subtitle: {
		fontSize: 14,
		fontWeight:'400',
		marginTop: 6,
		marginBottom: 18,
	},
	grid: {
		width: "100%",
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		gap: 16,
		marginBottom: 24,
	},
	wideCard: {
		width: "100%",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginTop: 2,
	},
	wideLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.2,
		opacity: 0.9,
	},
	wideValue: {
		marginTop: 8,
		fontSize: 15,
		fontWeight: "700",
		letterSpacing: -0.1,
	},
	wideSubValue: {
		fontSize: 12,
		fontWeight: "500",
	},
});
