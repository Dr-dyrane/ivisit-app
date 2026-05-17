import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
	bodyScrollContent: {
		paddingHorizontal: 14,
		paddingTop: 4,
		paddingBottom: 40,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		paddingBottom: 16,
	},
	headerCopy: {
		flex: 1,
		gap: 3,
	},
	title: {
		fontSize: 22,
		lineHeight: 26,
		fontWeight: "700",
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
});

export default styles;
