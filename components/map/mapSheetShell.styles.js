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
		shadowColor: "#0F172A",
		shadowOpacity: 0.2,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
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
		position: "relative",
		zIndex: 8,
	},
	topSlotGestureRegionOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 24,
		elevation: 24,
		overflow: "visible",
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
		zIndex: 1,
	},
	contentViewportGestureRegion: {
		width: "100%",
		flex: 1,
	},
});
