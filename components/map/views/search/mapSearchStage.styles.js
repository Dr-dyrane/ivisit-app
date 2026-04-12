import { StyleSheet } from "react-native";

export default StyleSheet.create({
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 20,
		paddingHorizontal: 16,
	},
	topRowCollapsed: {
		marginBottom: 0,
	},
	searchPill: {
		flex: 1,
		minHeight: 50,
		paddingHorizontal: 15,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	searchPillCollapsed: {
		minHeight: 44,
		paddingHorizontal: 14,
	},
	searchText: {
		fontSize: 16,
		lineHeight: 21,
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
		gap: 12,
		marginBottom: 18,
	},
	activeSearchBar: {
		flex: 1,
		marginBottom: 0,
	},
	closeButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 2,
	},
	closeButtonDisabled: {
		opacity: 0.72,
	},
});
