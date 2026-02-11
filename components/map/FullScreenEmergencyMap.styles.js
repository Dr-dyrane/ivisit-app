import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
	},
	map: {
		flex: 1,
	},
	loadingContainer: {
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		fontSize: 14,
		fontWeight: "500",
		marginTop: 12,
	},
	errorContainer: {
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	errorText: {
		fontSize: 16,
		fontWeight: "400",
		textAlign: "center",
		marginTop: 16,
		marginBottom: 4,
	},
	errorSubtext: {
		fontSize: 13,
		textAlign: "center",
		marginBottom: 20,
	},
	retryButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 25,
		marginTop: 8,
	},
	retryButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
	},
	statusBarBlur: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
	},
	hospitalMarker: {
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalMarkerSelected: {
		transform: [{ scale: 1.1 }],
	},
	hospitalMarkerRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	hospitalLabelPill: {
		marginLeft: 6,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
		maxWidth: 140,
	},
	hospitalLabelText: {
		fontSize: 9,
		fontWeight: "600",
	},
	// Web fallback styles
	webMapFallback: {
		backgroundColor: "#F8FAFC",
		justifyContent: "center",
		alignItems: "center",
	},
	webMapContent: {
		alignItems: "center",
		justifyContent: "center",
	},
	webMapText: {
		fontSize: 24,
		fontWeight: "bold",
		marginTop: 12,
	},
	webMapSubtext: {
		fontSize: 16,
		marginTop: 4,
	},
	selectedHospitalInfo: {
		marginTop: 20,
		alignItems: "center",
	},
	selectedHospitalName: {
		fontSize: 18,
		fontWeight: "600",
		textAlign: "center",
	},
	selectedHospitalDistance: {
		fontSize: 14,
		marginTop: 4,
	},
});
