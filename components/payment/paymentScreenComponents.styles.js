import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

// PULLBACK NOTE: Extracted styles from PaymentScreenComponents.jsx
// OLD: Styles inline in component file
// NEW: Separate styles file following map sheets pattern
// REASON: Improve modularity and maintainability

const styles = StyleSheet.create({
	balanceCardWrapper: {
		borderRadius: 32,
		borderCurve: "continuous",
		overflow: "hidden",
		height: 180,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 8,
	},
	balanceCard: {
		padding: 24,
		height: "100%",
		justifyContent: "space-between",
	},
	balanceHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
	},
	walletLabel: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 1,
		color: "rgba(255,255,255,0.8)",
		textTransform: "uppercase",
	},
	balanceValue: {
		fontSize: 36,
		fontWeight: "900",
		color: "#FFFFFF",
		marginTop: 8,
		letterSpacing: -1,
	},
	currencyBadge: {
		backgroundColor: "rgba(255,255,255,0.2)",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		borderCurve: "continuous",
	},
	currencyText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#FFFFFF",
	},
	walletActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	topUpButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		borderCurve: "continuous",
	},
	topUpText: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.brandPrimary,
	},
	section: {
		borderRadius: 24,
		borderCurve: "continuous",
		padding: 20,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 16,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	itemInfo: {
		flex: 1,
	},
	rowLabel: {
		fontSize: 15,
		fontWeight: "600",
	},
	subLabel: {
		fontSize: 12,
		color: "#94A3B8",
		marginTop: 2,
	},
	rowValue: {
		fontSize: 15,
		fontWeight: "700",
	},
	divider: {
		height: 1,
		marginVertical: 16,
	},
	totalRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: "700",
	},
	totalValue: {
		fontSize: 20,
		fontWeight: "900",
	},
	activityContainer: {
		gap: 16,
	},
	activityHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	viewAllText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.brandPrimary,
	},
	ledgerList: {
		borderRadius: 24,
		borderCurve: "continuous",
		overflow: "hidden",
	},
	ledgerItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		gap: 12,
	},
	skeletonText: {
		height: 12,
		borderRadius: 4,
	},
	ledgerDivider: {
		// borders removed (iVisit rule); separation via vertical rhythm
	},
	typeIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
	},
	ledgerMeta: {
		flex: 1,
	},
	ledgerDesc: {
		fontSize: 15,
		fontWeight: "600",
	},
	ledgerDate: {
		fontSize: 13,
		fontWeight: "500",
		marginTop: 2,
	},
	ledgerAmount: {
		fontSize: 16,
		fontWeight: "700",
	},
	emptyLedger: {
		borderRadius: 24,
		borderCurve: "continuous",
		padding: 32,
		alignItems: "center",
	},
	emptyText: {
		fontSize: 14,
		fontWeight: "500",
		marginTop: 12,
	},
	seeMoreButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 12,
		gap: 8,
	},
	seeMoreText: {
		fontSize: 14,
		fontWeight: "600",
	},
	linkCardButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 2,
	},
	linkCardContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	linkCardIcon: {
		width: 48,
		height: 48,
		backgroundColor: "rgba(34, 197, 94, 0.1)",
		alignItems: "center",
		justifyContent: "center",
	},
	linkCardTitle: {
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	linkCardSub: {
		fontSize: 12,
		fontWeight: "600",
	},
	glowCard: {
		borderRadius: 32,
		borderCurve: "continuous",
		padding: 24,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: COLORS.brandPrimary,
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.1,
		shadowRadius: 24,
		elevation: 8,
	},
	amountDisplay: {
		alignItems: "center",
		marginBottom: 16,
	},
	amountLabel: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	amountValue: {
		fontSize: 36,
		fontWeight: "900",
		letterSpacing: -1,
	},
	insuranceBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "rgba(134, 16, 14, 0.1)",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		borderCurve: "continuous",
	},
	insuranceBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.brandPrimary,
	},
	serviceAssurance: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 12,
	},
	serviceText: {
		fontSize: 11,
		fontWeight: "500",
	},
	addFundsCard: {
		padding: 20,
		marginBottom: 0,
		alignSelf: "center",
		width: "90%",
	},
	addFundsHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
	},
	addFundsTitle: {
		fontSize: 17,
		fontWeight: "600",
		letterSpacing: -0.2,
	},
	closeButton: {
		padding: 8,
	},
	amountInputWrapper: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	amountInput: {
		flex: 1,
		fontSize: 17,
		fontWeight: "400",
		padding: 12,
		height: 44,
		letterSpacing: -0.1,
	},
	currencyPrefix: {
		fontSize: 17,
		fontWeight: "500",
		marginRight: 10,
		opacity: 0.7,
	},
	presetGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 16,
	},
	presetChip: {
		flex: 1,
		minWidth: "22%",
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
	},
	presetText: {
		fontSize: 14,
		fontWeight: "500",
		letterSpacing: -0.1,
	},
	confirmButton: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
	},
	confirmButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#FFFFFF",
		letterSpacing: -0.1,
	},
	historyModalCard: {
		borderRadius: 32,
		borderCurve: "continuous",
		padding: 0,
		height: "85%",
	},
	historyModalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 20,
		paddingBottom: 12,
	},
	historyModalTitle: {
		fontSize: 20,
		fontWeight: "800",
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
	},
	filterContainer: {
		paddingHorizontal: 20,
		paddingBottom: 16,
		// borders removed (iVisit rule)
	},
	filterScroll: {
		gap: 8,
	},
	filterChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		borderCurve: "continuous",
	},
	filterChipActive: {
		backgroundColor: "rgba(134, 16, 14, 0.1)",
	},
	filterText: {
		fontSize: 13,
		fontWeight: "600",
	},
	filterBadge: {
		backgroundColor: COLORS.brandPrimary,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
		minWidth: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	filterBadgeText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#FFFFFF",
	},
	historyScroll: {
		flex: 1,
	},
	historyGroup: {
		paddingTop: 16,
	},
	groupTitle: {
		fontSize: 12,
		fontWeight: "700",
		marginBottom: 8,
		marginHorizontal: 20,
	},
	historyItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		paddingHorizontal: 20,
		gap: 12,
	},
	historyDivider: {
		// borders removed (iVisit rule); separation via vertical rhythm
	},
	historyEmptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
	},
	historyEmptyText: {
		fontSize: 14,
		fontWeight: "600",
		marginTop: 12,
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	modalBackdrop: {
		flex: 1,
	},
	receiptCard: {
		borderRadius: 32,
		borderCurve: "continuous",
		padding: 24,
		marginBottom: 0,
	},
	modalGrabber: {
		width: 36,
		height: 4,
		backgroundColor: "rgba(0,0,0,0.1)",
		borderRadius: 2,
		alignSelf: "center",
		marginBottom: 20,
	},
	receiptHeader: {
		alignItems: "center",
		marginBottom: 24,
	},
	receiptIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	receiptAmount: {
		fontSize: 32,
		fontWeight: "900",
		marginBottom: 8,
	},
	receiptStatus: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 1,
	},
	receiptBody: {
		gap: 16,
		marginBottom: 24,
	},
	receiptRow: {
		gap: 4,
	},
	receiptLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
		color: "#94A3B8",
	},
	receiptValue: {
		fontSize: 14,
		fontWeight: "600",
	},
	doneButton: {
		backgroundColor: COLORS.brandPrimary,
		padding: 16,
		borderRadius: 16,
		borderCurve: "continuous",
		alignItems: "center",
	},
	doneButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#FFFFFF",
	},
	footer: {
		gap: 16,
	},
	securityRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		justifyContent: "center",
	},
	securityText: {
		fontSize: 12,
		fontWeight: "600",
	},
	payButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		padding: 18,
		borderRadius: 16,
		borderCurve: "continuous",
	},
	payButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#FFFFFF",
	},
});

export default styles;
