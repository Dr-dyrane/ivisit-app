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
	bodyScrollContentSidebar: {
		flexGrow: 1,
		paddingBottom: 0,
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
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
	},
	iconButtonCompact: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
});

export default sheetStageStyles;
