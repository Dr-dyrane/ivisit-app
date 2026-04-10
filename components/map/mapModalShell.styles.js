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
	},
	sheetBlur: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
	},
	sheetSurface: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
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
	headerTitle: {
		fontSize: 21,
		lineHeight: 24,
		fontWeight: "800",
	},
	headerSpacer: {
		width: 40,
		height: 40,
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
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
	content: {
		flexGrow: 1,
	},
	footerSlot: {
		flexShrink: 0,
	},
});
