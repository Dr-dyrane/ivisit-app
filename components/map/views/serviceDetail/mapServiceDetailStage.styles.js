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
		width: 38,
		height: 38,
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
		width: 38,
		height: 38,
	},
	topSlotCloseButton: {
		width: 38,
		height: 38,
		borderRadius: 999,
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
		paddingVertical: 16,
		...squircle(28),
	},
	headerMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerTypePill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		height: 28,
		borderRadius: 999,
	},
	headerTypeDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 7,
	},
	headerTypeLabel: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: "700",
	},
	positionLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		marginLeft: 12,
	},
	summary: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "400",
		marginTop: 10,
	},
	headerAssistiveLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "600",
		marginTop: 8,
	},
	switchLabel: {
		marginBottom: 12,
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: 8,
		width: "100%",
	},
	switchPill: {
		height: 36,
		flex: 1,
		minWidth: 0,
		paddingHorizontal: 10,
		borderRadius: 18,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	switchAccent: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 8,
	},
	switchPillLabel: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		textAlign: "center",
		flexShrink: 1,
	},
	heroCard: {
		height: 170,
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
	optionList: {
		gap: 10,
	},
	optionRow: {
		minHeight: 78,
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderRadius: 22,
		flexDirection: "row",
		alignItems: "center",
	},
	optionRowSpaced: {
		marginTop: 10,
	},
	optionCopy: {
		flex: 1,
		paddingRight: 10,
	},
	optionImage: {
		width: 66,
		height: 48,
		marginRight: 8,
	},
	optionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	optionMeta: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
		marginTop: 5,
	},
	optionStatePill: {
		minWidth: 76,
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	optionStateText: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: "800",
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
		shadowOffset: { width: 0, height: 12 },
		shadowRadius: 18,
		borderCurve: "continuous",
	},
});
