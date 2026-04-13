import { StyleSheet } from "react-native";

export default StyleSheet.create({
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 12,
		paddingHorizontal: 14,
	},
	topRowCollapsed: {
		marginBottom: 0,
	},
	searchPill: {
		flex: 1,
		minHeight: 42,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	searchPillCollapsed: {
		minHeight: 40,
		paddingHorizontal: 13,
	},
	searchText: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "600",
	},
	bodyScrollViewport: {
		flex: 1,
	},
	bodyScrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 6,
	},
	activeSearchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 10,
	},
	activeSearchBar: {
		flex: 1,
		marginBottom: 0,
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 2,
	},
	closeButtonDisabled: {
		opacity: 0.72,
	},
});
