import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, Fontisto } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { COLORS } from "../../../constants/colors";

const DetailRow = ({ icon, label, value, isLast, isDarkMode }) => (
	<View style={[styles.detailRow, !isLast && styles.detailRowBorder, { borderColor: isDarkMode ? "#2C2C2E" : "#E5E5EA" }]}>
		<View style={styles.detailLeft}>
			<View style={[styles.iconContainer, { backgroundColor: isDarkMode ? "#2C2C2E" : "#F2F2F7" }]}>
				{icon}
			</View>
			<Text style={[styles.detailLabel, { color: isDarkMode ? "#8E8E93" : "#8E8E93" }]}>{label}</Text>
		</View>
		<Text style={[styles.detailValue, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]} numberOfLines={1}>
			{value}
		</Text>
	</View>
);

export default function EmergencyRequestModalDispatched({ 
	requestData, 
	textColor, 
	mutedColor, 
	cardColor,
	onRequestDone,
	onViewClinicalRecord,
}) {
	const { isDarkMode } = useTheme();
	const isBed = requestData?.serviceType === "bed";
	const bedNumber = requestData?.bedNumber ?? (isBed ? `B-${Math.floor(Math.random() * 90) + 10}` : null);
	const canOpenClinicalRecord = typeof onViewClinicalRecord === "function";

	return (
		<View style={styles.container}>
			{/* Hero Status Section */}
			<View style={styles.heroSection}>
				<View style={[styles.heroIconCircle, { backgroundColor: isDarkMode ? "#2C2C2E" : "#F2F2F7" }]}>
					{isBed ? (
						<Fontisto name="bed-patient" size={32} color={COLORS.brandPrimary} />
					) : (
						<Ionicons name="medical" size={32} color={COLORS.brandPrimary} />
					)}
				</View>
				<Text style={[styles.title, { color: textColor }]}>
					{isBed ? "Bed Reserved" : "Help is on the way"}
				</Text>
				<Text style={[styles.subtitle, { color: mutedColor }]}>
					{isBed ? "You're confirmed" : "Responder assigned and moving toward you."}
				</Text>
			</View>

			{/* Details Group */}
			<View style={[styles.detailsGroup, { backgroundColor: cardColor }]}>
				<DetailRow 
					isDarkMode={isDarkMode}
					icon={<Ionicons name="document-text" size={16} color={COLORS.brandPrimary} />}
					label="Request ID"
					value={requestData?.requestId ?? "--"}
				/>
				
				<DetailRow 
					isDarkMode={isDarkMode}
					icon={<Ionicons name="time" size={16} color={COLORS.brandPrimary} />}
					label={isBed ? "Est. Wait" : "ETA"}
					value={requestData?.estimatedArrival ?? "--"}
				/>

				<DetailRow 
					isDarkMode={isDarkMode}
					icon={<Ionicons name="business" size={16} color={COLORS.brandPrimary} />}
					label="Hospital"
					value={requestData?.hospitalName ?? "--"}
				/>

				{isBed ? (
					<>
						<DetailRow 
							isDarkMode={isDarkMode}
							icon={<Fontisto name="doctor" size={14} color={COLORS.brandPrimary} />}
							label="Specialty"
							value={requestData?.specialty ?? "Any"}
						/>
						<DetailRow 
							isDarkMode={isDarkMode}
							icon={<Ionicons name="bed" size={16} color={COLORS.brandPrimary} />}
							label="Details"
							value={`${bedNumber} • ${requestData?.bedCount ?? 1} Bed(s)`}
							isLast
						/>
					</>
				) : (
					<DetailRow 
						isDarkMode={isDarkMode}
						icon={<Ionicons name="car" size={16} color={COLORS.brandPrimary} />}
						label="Vehicle"
						value={
							requestData?.ambulanceType?.name || 
							requestData?.ambulanceType?.title || 
							"Ambulance"
						}
						isLast
					/>
				)}
			</View>
			{canOpenClinicalRecord ? (
				<Pressable onPress={onViewClinicalRecord} style={styles.clinicalCta}>
					<Ionicons name="document-text-outline" size={16} color={COLORS.brandPrimary} />
					<Text style={[styles.clinicalCtaText, { color: COLORS.brandPrimary }]}>
						View Full Clinical Record
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 20,
		alignItems: "center",
	},
	heroSection: {
		alignItems: 'center',
		marginBottom: 32,
	},
	heroIconCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: "700", // Apple-style Bold
		letterSpacing: 0.3,
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		fontWeight: '400',
		textAlign: 'center',
		opacity: 0.8,
	},
	detailsGroup: {
		width: "100%",
		borderRadius: 16,
		overflow: 'hidden',
	},
	clinicalCta: {
		marginTop: 14,
		height: 44,
		borderRadius: 22,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: COLORS.brandPrimary + "10",
	},
	clinicalCtaText: {
		fontSize: 13,
		fontWeight: "800",
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		paddingHorizontal: 16,
	},
	detailRowBorder: {
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	detailLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconContainer: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	detailLabel: {
		fontSize: 16,
		fontWeight: "500",
	},
	detailValue: {
		fontSize: 16,
		fontWeight: "400",
		textAlign: 'right',
		flex: 1,
		marginLeft: 16,
	},
});
