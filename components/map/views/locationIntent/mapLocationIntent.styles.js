import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
	bodyScrollContent: {
		paddingTop: 6,
		paddingBottom: 6,
		gap: 12,
	},
	sectionGap: {
		height: 12,
	},
	searchInputShell: {
		height: 46,
		borderRadius: 14,
		borderCurve: "continuous",
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},
	searchInput: {
		flex: 1,
		minWidth: 0,
		paddingVertical: 0,
		fontSize: 15,
	},
	searchInputIconButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
	pressedScale: {
		opacity: 0.82,
		transform: [{ scale: 0.98 }],
	},
	rowPressed: {
		opacity: 0.88,
		transform: [{ scale: 0.99 }],
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "600",
	},
	currentCard: {
		borderRadius: 22,
		borderCurve: "continuous",
		padding: 14,
		gap: 10,
	},
	currentCardRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	currentCardLabel: {
		fontSize: 15,
		fontWeight: "600",
	},
	currentCardBadge: {
		fontSize: 12,
		fontWeight: "600",
	},
	currentCardAddress: {
		fontSize: 14,
		fontWeight: "600",
	},
	currentCardBody: {
		fontSize: 13,
	},
	currentCardActions: {
		flexDirection: "row",
		gap: 8,
	},
	currentCardAction: {
		flex: 1,
		borderRadius: 12,
		borderCurve: "continuous",
		paddingVertical: 10,
		paddingHorizontal: 10,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 6,
	},
	currentCardActionLabel: {
		fontSize: 12,
		fontWeight: "600",
	},
	orbRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
	},
	orbItem: {
		flex: 1,
		alignItems: "center",
		gap: 6,
	},
	orbCircle: {
		width: 50,
		height: 50,
		borderRadius: 25,
		alignItems: "center",
		justifyContent: "center",
	},
	orbLabelBelow: {
		fontSize: 12,
		fontWeight: "600",
	},
	listCard: {
		borderRadius: 22,
		borderCurve: "continuous",
		overflow: "hidden",
	},
	listRow: {
		paddingVertical: 12,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	listRowTextWrap: {
		flex: 1,
		paddingRight: 10,
	},
	listRowTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
	listRowSubtitle: {
		fontSize: 12,
		marginTop: 2,
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 14,
	},
	manualIntroCard: {
		borderRadius: 20,
		borderCurve: "continuous",
		padding: 14,
		gap: 8,
	},
	manualTitle: {
		fontSize: 14,
		fontWeight: "700",
	},
	manualBody: {
		fontSize: 12,
	},
	manualAction: {
		marginTop: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	manualStepCard: {
		borderRadius: 22,
		borderCurve: "continuous",
		padding: 14,
		gap: 10,
	},
	manualStepLabel: {
		fontSize: 13,
		fontWeight: "600",
	},
	manualStepProgress: {
		fontSize: 12,
	},
	manualTextInput: {
		minHeight: 46,
		borderRadius: 14,
		borderCurve: "continuous",
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 15,
	},
	manualStepActions: {
		flexDirection: "row",
		gap: 8,
	},
	manualStepButton: {
		flex: 1,
		borderRadius: 12,
		borderCurve: "continuous",
		paddingVertical: 10,
		alignItems: "center",
	},
	manualStepButtonLabel: {
		fontSize: 13,
		fontWeight: "600",
	},
});

export default styles;
