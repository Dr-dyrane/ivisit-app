// history.styles.js
// Stable StyleSheet fragments for /map history surfaces.
//
// Each *.jsx in this folder imports from here; no StyleSheet.create() lives
// inside .jsx files. Per MAP_DESIGN_SYSTEM_OVERVIEW_V1 §18.

import { StyleSheet } from "react-native";

export const HISTORY_CONTINUOUS_RADIUS = Object.freeze({
	borderCurve: "continuous",
});

export const historyRowStyles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 18,
		borderCurve: "continuous",
	},
	iconWrap: {
		alignItems: "center",
		justifyContent: "center",
	},
	copy: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontWeight: "500",
	},
	subtitle: {
		fontWeight: "500",
		letterSpacing: -0.08,
	},
	metaColumn: {
		minWidth: 72,
		alignItems: "flex-end",
		marginLeft: 10,
		gap: 8,
	},
	metaTimeText: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "700",
		letterSpacing: -0.08,
	},
	metaBottomRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 8,
	},
	statusChip: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	statusChipText: {
		fontSize: 11,
		fontWeight: "700",
	},
	divider: {
		alignSelf: "stretch",
		height: StyleSheet.hairlineWidth,
	},
	dividerInset: {
		// Indent divider past the leading orb column so group-lists look Apple-Maps-tight.
		marginLeft: 0,
	},
});

export const historyGroupStyles = StyleSheet.create({
	group: {
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerTitle: {
		fontWeight: "700",
	},
	headerChevron: {
		marginLeft: 6,
	},
	container: {
		...HISTORY_CONTINUOUS_RADIUS,
	},
});

export const historyModalStyles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 14,
	},
	scrollContent: {
		paddingBottom: 100,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	filterStripWrap: {
		marginBottom: 6,
	},
	filterStripContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 2,
		paddingVertical: 2,
	},
	filterChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingLeft: 10,
		paddingRight: 10,
		paddingVertical: 8,
		borderRadius: 18,
		borderCurve: "continuous",
	},
	filterChipLabel: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "700",
		maxWidth: 132,
	},
	filterChipCountText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
	},
	groupStack: {
		gap: 18,
	},
	skeletonGroup: {
		gap: 10,
	},
	skeletonHeader: {
		width: 104,
		height: 16,
		borderRadius: 999,
		borderCurve: "continuous",
	},
	skeletonContainer: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderCurve: "continuous",
	},
	skeletonRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 12,
		gap: 12,
	},
	skeletonOrb: {
		borderRadius: 999,
		borderCurve: "continuous",
	},
	skeletonCopy: {
		flex: 1,
		gap: 8,
	},
	skeletonLinePrimary: {
		height: 16,
		width: "62%",
		borderRadius: 999,
		borderCurve: "continuous",
	},
	skeletonLineSecondary: {
		height: 13,
		width: "46%",
		borderRadius: 999,
		borderCurve: "continuous",
	},
	skeletonChip: {
		width: 70,
		height: 24,
		borderRadius: 999,
		borderCurve: "continuous",
	},
	emptyCard: {
		alignItems: "flex-start",
		...HISTORY_CONTINUOUS_RADIUS,
	},
	emptyTitle: {
		fontWeight: "700",
	},
	emptyBody: {
		fontWeight: "400",
	},
	emptyAction: {
		alignSelf: "stretch",
		alignItems: "center",
		justifyContent: "center",
		...HISTORY_CONTINUOUS_RADIUS,
	},
	emptyActionText: {
		fontWeight: "700",
	},
	bottomAction: {
		alignSelf: "stretch",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 15,
		marginTop: 16,
		...HISTORY_CONTINUOUS_RADIUS,
	},
	bottomActionText: {
		fontSize: 16,
		fontWeight: "700",
	},
});

export const historyDetailsStyles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 14,
	},
	hero: {
		...HISTORY_CONTINUOUS_RADIUS,
	},
	heroTopRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	heroOrb: {
		alignItems: "center",
		justifyContent: "center",
	},
	heroCopy: {
		flex: 1,
		marginLeft: 14,
		minWidth: 0,
	},
	heroTitle: {
		fontWeight: "700",
	},
	heroSubtitle: {
		fontWeight: "500",
	},
	heroMeta: {
		fontWeight: "400",
	},
	heroStatusChip: {
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		marginLeft: 12,
	},
	heroStatusText: {
		fontSize: 11,
		fontWeight: "700",
	},
	primaryButton: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 16,
		...HISTORY_CONTINUOUS_RADIUS,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: "700",
	},
	section: {
		...HISTORY_CONTINUOUS_RADIUS,
	},
	sectionTitle: {
		fontWeight: "700",
	},
	sectionBody: {
		marginTop: 14,
	},
	detailRow: {
		marginBottom: 14,
	},
	detailLabel: {
		fontWeight: "500",
	},
	detailValue: {
		marginTop: 4,
		fontWeight: "500",
	},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	actionLabel: {
		fontWeight: "500",
	},
	preparationList: {
		marginTop: 14,
	},
	preparationRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		marginBottom: 12,
	},
	preparationDot: {
		width: 7,
		height: 7,
		borderRadius: 999,
		marginTop: 7,
	},
	preparationText: {
		flex: 1,
		fontSize: 15,
		lineHeight: 21,
		fontWeight: "400",
	},
	cancelButton: {
		alignItems: "center",
		justifyContent: "center",
		...HISTORY_CONTINUOUS_RADIUS,
	},
});
