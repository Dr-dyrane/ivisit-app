import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

// Stage-layer styles (top slot + scroll container) for VISIT_DETAIL.
// Body content styles live in components/map/surfaces/visitDetail/mapVisitDetail.styles.js.
const styles = StyleSheet.create({
	bodyScrollContent: {
		paddingHorizontal: 0,
		paddingTop: 0,
		paddingBottom: 6,
	},
	floatingTopSlot: {
		position: "relative",
		width: "100%",
		height: 88,
		paddingHorizontal: 0,
		zIndex: 28,
		elevation: 28,
	},
	floatingTopHeader: {
		position: "absolute",
		top: 18,
		left: 16,
		right: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		zIndex: 30,
		elevation: 30,
	},
	floatingTopActionPressable: {
		width: 38,
		height: 38,
		zIndex: 31,
	},
	floatingTopActionButton: {
		width: 38,
		height: 38,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		...squircle(19),
	},
	floatingTopActionSpacer: {
		width: 38,
		height: 38,
	},
	floatingTopTitleWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 10,
	},
	floatingTopTitle: {
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "700",
		textAlign: "center",
	},
	floatingTopSubtitle: {
		marginTop: 1,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "500",
		textAlign: "center",
	},
	floatingTopClosePressable: {
		width: 38,
		height: 38,
		zIndex: 31,
	},
	floatingTopCloseButton: {
		width: 38,
		height: 38,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		borderRadius: 999,
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
		flex: 1,
		width: 38,
		height: 38,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		shadowColor: "#0F172A",
		shadowOpacity: 0.12,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		borderRadius: 999,
	},
	collapsedIconButtonPrimary: {
		shadowOpacity: 0.2,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
	},
	collapsedIconButtonPressed: {
		opacity: 0.92,
		transform: [{ scale: 0.97 }],
	},
	collapsedIconButtonPressable: {
		width: 38,
		height: 38,
	},
	// PULLBACK NOTE: Fix collapsed summary pressable to match hospital detail
	// OLD: Using flex: 5 and fixed height
	// NEW: Use flex: 1 to match hospital detail pattern
	collapsedSummaryPressable: {
		flex: 1,
	},
	// PULLBACK NOTE: Fix collapsed summary card to match hospital detail for centered text
	// OLD: Missing alignItems and padding
	// NEW: Add alignItems center and padding for proper centering
	collapsedSummaryCard: {
		minHeight: 44,
		paddingHorizontal: 4,
		paddingVertical: 4,
		alignItems: "center",
		justifyContent: "center",
	},
	collapsedTitle: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "600",
	},
	collapsedSubtitle: {
		marginTop: 1,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "500",
	},
});

export default styles;
