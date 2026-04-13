import { StyleSheet } from "react-native";

export default StyleSheet.create({
	sheetHost: {
		position: "absolute",
		overflow: "visible",
		backfaceVisibility: "hidden",
	},
	sheetHostFloating: {
		alignSelf: "center",
	},
	sheetHostModal: {
		maxWidth: "100%",
	},
	sheetHostPanel: {
		maxWidth: "100%",
	},
	sheetHostSidebar: {
		maxWidth: "100%",
	},
	sheetUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		backfaceVisibility: "hidden",
	},
	sheetClip: {
		flex: 1,
		overflow: "hidden",
		borderCurve: "continuous",
		backfaceVisibility: "hidden",
	},
	sheetContent: {
		flex: 1,
		minHeight: 0,
	},
	sheetContentHandleOverlay: {
		paddingTop: 0,
	},
	handle: {
		alignSelf: "center",
		height: 5,
		borderRadius: 999,
	},
	handleFloating: {
		height: 5,
		backgroundColor: "rgba(255,255,255,0.92)",
		borderWidth: 0.5,
		borderColor: "rgba(15,23,42,0.24)",
		shadowColor: "#0F172A",
		shadowOpacity: 0.5,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 4,
	},
	dragZone: {
		position: "relative",
		alignItems: "center",
		paddingBottom: 2,
		zIndex: 2,
	},
	dragZoneFloating: {
		position: "absolute",
		top: 8,
		width: 96,
		alignSelf: "center",
		zIndex: 20,
	},
	topSlotGestureRegion: {
		width: "100%",
	},
	handleTapTarget: {
		alignSelf: "center",
		paddingHorizontal: 8,
		paddingTop: 0,
		paddingBottom: 0,
	},
	handleTapTargetFloating: {
		paddingHorizontal: 8,
		paddingTop: 9,
		paddingBottom: 10,
	},
	handleTapTargetCollapsed: {
		paddingHorizontal: 10,
		paddingTop: 2,
		paddingBottom: 2,
	},
	contentViewport: {
		flex: 1,
		minHeight: 0,
	},
	contentViewportGestureRegion: {
		width: "100%",
		flex: 1,
	},
});
