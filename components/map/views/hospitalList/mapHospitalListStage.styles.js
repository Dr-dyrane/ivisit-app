import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
	bodyScrollContent: {
		paddingHorizontal: 14,
		paddingTop: 0,
		paddingBottom: 6,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	headerCopy: {
		flex: 1,
		gap: 3,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.4,
		textTransform: "uppercase",
	},
	title: {
		fontSize: 22,
		lineHeight: 26,
		fontWeight: "700",
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "500",
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
