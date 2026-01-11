import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { COLORS } from "../../../constants/colors";
import InfoTile from "./InfoTile";

export default function EmergencyRequestModalDispatched({ 
	requestData, 
	textColor, 
	mutedColor, 
	cardColor,
	onRequestDone 
}) {
	const { isDarkMode } = useTheme();
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
						icon="document-text-outline"
					/>
					<InfoTile
						label="Bed Number"
						value={bedNumber ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
						icon="bed-outline"
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
						icon="layers-outline"
					/>
					<InfoTile
						label="Est. Wait"
						value={requestData?.estimatedArrival ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
						valueColor={COLORS.brandPrimary}
						icon="time-outline"
					/>
					<View style={[
						styles.wideCard, 
						{ 
							backgroundColor: cardColor,
							// Remove border, use shadow for depth
							shadowColor: isDarkMode ? '#000' : '#000',
							shadowOffset: { width: 0, height: 1 },
							shadowOpacity: isDarkMode ? 0.3 : 0.1,
							shadowRadius: 2,
							elevation: 2,
						}
					]}>
						<View style={styles.wideLabelRow}>
							<Ionicons 
								name="business-outline" 
								size={12} 
								color={isDarkMode ? COLORS.textMutedDark : mutedColor} 
								style={styles.wideLabelIcon}
							/>
							<Text style={[styles.wideLabel, { color: isDarkMode ? COLORS.textMutedDark : mutedColor }]}>
								Hospital
							</Text>
						</View>
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
						icon="document-text-outline"
					/>
					<InfoTile
						label="ETA"
						value={requestData?.estimatedArrival ?? "--"}
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
						valueColor={COLORS.brandPrimary}
						icon="time-outline"
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
						icon="medical-outline"
					/>
					<InfoTile
						label="Status"
						value="En Route"
						textColor={textColor}
						mutedColor={mutedColor}
						cardColor={cardColor}
						icon="navigate-outline"
					/>
					<View style={[
						styles.wideCard, 
						{ 
							backgroundColor: cardColor,
							// Remove border, use shadow for depth
							shadowColor: isDarkMode ? '#000' : '#000',
							shadowOffset: { width: 0, height: 1 },
							shadowOpacity: isDarkMode ? 0.3 : 0.1,
							shadowRadius: 2,
							elevation: 2,
						}
					]}>
						<View style={styles.wideLabelRow}>
							<Ionicons 
								name="business-outline" 
								size={12} 
								color={isDarkMode ? COLORS.textMutedDark : mutedColor} 
								style={styles.wideLabelIcon}
							/>
							<Text style={[styles.wideLabel, { color: isDarkMode ? COLORS.textMutedDark : mutedColor }]}>
								Hospital
							</Text>
						</View>
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
		marginBottom: 24,
		textAlign: 'center',
	},
	grid: {
		width: "100%",
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 20,
	},
	wideCard: {
		width: "100%",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginTop: 2,
		marginBottom: 24,
	},
	wideLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	wideLabelIcon: {
		marginRight: 4,
	},
	wideLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.2,
		opacity: 0.9,
	},
	wideValue: {
		marginTop: 6,
		fontSize: 15,
		fontWeight: "700",
		letterSpacing: -0.1,
	},
	wideSubValue: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 4,
	},
});
