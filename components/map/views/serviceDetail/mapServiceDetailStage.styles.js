import { Platform, StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export default StyleSheet.create({
	topSlot: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingBottom: 0,
		paddingTop: 0,
		marginTop: Platform.OS === "android" ? -6 : 0,
	},
	topSlotSpacer: {
		width: 34,
		height: 34,
	},
	topSlotTitle: {
		flex: 1,
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "700",
		textAlign: "center",
		paddingHorizontal: 8,
	},
	topSlotAction: {
		width: 34,
		height: 34,
	},
	topSlotCloseButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
	topSlotPressed: {
		opacity: 0.92,
		transform: [{ scale: 0.97 }],
	},
	bodyContent: {
		paddingHorizontal: 14,
		paddingTop: Platform.OS === "android" ? 2 : 0,
		paddingBottom: 116,
	},
	sectionSpacer: {
		height: Platform.OS === "android" ? 20 : 18,
	},
	sectionSpacerLarge: {
		height: Platform.OS === "android" ? 24 : 20,
	},
	headerBlock: {
		paddingHorizontal: 18,
		paddingVertical: 18,
		...squircle(28),
	},
	headerMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	eyebrow: {
		flexShrink: 1,
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
	},
	positionLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		marginLeft: 12,
	},
	summary: {
		fontSize: 14,
		lineHeight: 21,
		fontWeight: "400",
		marginTop: 8,
	},
	heroCard: {
		height: 184,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		...squircle(30),
	},
	heroImage: {
		width: "100%",
		height: "100%",
	},
	metricRow: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	metricPillSpaced: {
		marginRight: 10,
		marginBottom: Platform.OS === "android" ? 8 : 0,
	},
	metricPill: {
		height: 36,
		paddingLeft: 12,
		paddingRight: 12,
		paddingTop: 0,
		paddingBottom: 0,
		borderRadius: 999,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	metricIconBox: {
		width: 16,
		height: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	metricText: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "700",
		marginLeft: 6,
		includeFontPadding: false,
		textAlignVertical: "center",
	},
	sectionLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
		marginBottom: 12,
	},
	featureList: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		...squircle(24),
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	featureRowSpaced: {
		marginTop: 12,
	},
	featureDot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		marginTop: 6,
		marginRight: 11,
	},
	featureText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	footerGap: {
		height: 12,
	},
	footerDock: {
		position: "absolute",
		left: 14,
		right: 14,
		bottom: 16,
	},
	primaryButton: {
		minHeight: 56,
		paddingHorizontal: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		...squircle(20),
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "800",
	},
});
