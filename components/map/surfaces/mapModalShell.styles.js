import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	root: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "flex-end",
		zIndex: 220,
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.46)",
	},
	sheetHost: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		overflow: "hidden",
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		borderCurve: "continuous",
	},
	sheetBlur: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		borderCurve: "continuous",
	},
	sheetSurface: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		borderCurve: "continuous",
		paddingTop: 14,
		paddingHorizontal: 14,
	},
	keyboardAvoider: {
		flex: 1,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
	},
	headerLeadingWrap: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		minWidth: 0,
	},
	headerTitle: {
		flex: 1,
		fontSize: 21,
		lineHeight: 24,
		fontWeight: "700",
		textAlign: "center",
		marginHorizontal: 12,
	},
	headerTitleLeading: {
		flex: 1,
		textAlign: "left",
		marginLeft: 0,
		marginRight: 12,
	},
	headerTitleSpacer: {
		flex: 1,
	},
	headerSpacer: {
		width: 38,
		height: 38,
	},
	closeButton: {
		width: 38,
		height: 38,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		position: "relative",
	},
	handleWrap: {
		alignItems: "center",
		marginBottom: 12,
	},
	handle: {
		width: 46,
		height: 5,
		borderRadius: 999,
	},
	contentGestureRegion: {
		flex: 1,
		minHeight: 0,
	},
	contentGestureRegionActive: {
		width: "100%",
	},
	content: {
		flexGrow: 1,
	},
	footerSlot: {
		flexShrink: 0,
	},
});
