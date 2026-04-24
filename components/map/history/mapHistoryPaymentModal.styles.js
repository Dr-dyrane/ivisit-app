import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 12,
		gap: 14,
	},
	card: {
		paddingHorizontal: 18,
		paddingVertical: 18,
		...squircle(24),
		gap: 16,
	},
	header: {
		alignItems: "center",
		gap: 12,
	},
	iconOrb: {
		width: 72,
		height: 72,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 36,
	},
	amount: {
		fontSize: 32,
		lineHeight: 36,
		fontWeight: "700",
	},
	status: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "700",
	},
	body: {
		gap: 0,
	},
	row: {
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 16,
	},
	rowLabel: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.2,
		flexShrink: 0,
	},
	rowValue: {
		flex: 1,
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
		textAlign: "right",
	},
	rowValueMono: {
		fontSize: 11,
		lineHeight: 15,
		fontWeight: "500",
	},
	hairline: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 0,
	},
	doneButton: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 15,
		...squircle(18),
	},
	doneButtonText: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "700",
	},
	loadingStack: {
		gap: 10,
	},
	skeletonBlock: {
		borderRadius: 999,
		borderCurve: "continuous",
	},
	skeletonHeader: {
		alignItems: "center",
		gap: 12,
		marginBottom: 4,
	},
	skeletonOrb: {
		width: 72,
		height: 72,
		borderRadius: 36,
	},
	skeletonAmount: {
		width: "42%",
		height: 32,
	},
	skeletonStatus: {
		width: "24%",
		height: 16,
	},
	skeletonRow: {
		paddingVertical: 12,
		gap: 8,
	},
	skeletonLabel: {
		width: "28%",
		height: 12,
	},
	skeletonValue: {
		width: "58%",
		height: 16,
		alignSelf: "flex-end",
	},
});
