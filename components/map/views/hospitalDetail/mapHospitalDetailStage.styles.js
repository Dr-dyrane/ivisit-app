import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

const styles = StyleSheet.create({
	bodyScrollViewport: {
		flex: 1,
	},
	bodyScrollContent: {
		paddingHorizontal: 14,
		paddingTop: 0,
		paddingBottom: 6,
	},
	collapsedRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 14,
		paddingBottom: 4,
		paddingTop: 2,
	},
	collapsedIconButton: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		...squircle(18),
	},
	collapsedSummaryPressable: {
		flex: 1,
	},
	collapsedSummaryCard: {
		minHeight: 44,
		paddingHorizontal: 4,
		paddingVertical: 4,
		alignItems: "center",
		justifyContent: "center",
	},
	collapsedTitle: {
		fontSize: 16,
		lineHeight: 19,
		fontWeight: "800",
		textAlign: "center",
	},
	collapsedSubtitle: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		textAlign: "center",
	},
});

export default styles;
