import { StyleSheet } from "react-native";

const sheetStageStyles = StyleSheet.create({
	bodyScrollViewport: {
		flex: 1,
		minHeight: 0,
	},
	bodyScrollContent: {
		paddingBottom: 6,
	},
	bodyScrollContentSheet: {
		paddingHorizontal: 14,
	},
	bodyScrollContentModal: {
		paddingBottom: 16,
	},
	bodyScrollContentPanel: {
		paddingHorizontal: 0,
		paddingBottom: 22,
	},
	bodyScrollContentWide: {
		paddingHorizontal: 20,
	},
	bodyScrollContentSidebar: {
		flexGrow: 1,
	},
	topSlotContained: {
		width: "100%",
		alignSelf: "center",
	},
	topSlotSheet: {
		paddingHorizontal: 14,
	},
	topSlotModal: {
		paddingHorizontal: 16,
	},
	topSlotSidebar: {
		paddingHorizontal: 16,
	},
	topSlotPanel: {
		paddingHorizontal: 16,
	},
	iconButton: {
		width: 38,
		height: 38,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	iconButtonCompact: {
		width: 38,
		height: 38,
		borderRadius: 999,
	},
});

export default sheetStageStyles;
