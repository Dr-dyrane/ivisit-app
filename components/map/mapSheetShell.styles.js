import { StyleSheet } from "react-native";

export default StyleSheet.create({
	sheetHost: {
		position: "absolute",
		overflow: "visible",
	},
	sheetUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
	},
	sheetClip: {
		flex: 1,
		overflow: "hidden",
		borderCurve: "continuous",
	},
	sheetContent: {
		flex: 1,
	},
	handle: {
		alignSelf: "center",
		height: 5,
		borderRadius: 999,
	},
	dragZone: {
		alignItems: "center",
	},
	handleTapTarget: {
		alignSelf: "center",
		paddingHorizontal: 8,
		paddingTop: 0,
		paddingBottom: 0,
	},
	handleTapTargetCollapsed: {
		paddingHorizontal: 10,
		paddingTop: 2,
		paddingBottom: 2,
	},
	contentViewport: {
		flex: 1,
	},
});
