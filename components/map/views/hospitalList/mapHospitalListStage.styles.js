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
		fontWeight: "800",
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "500",
	},
	closeButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
	},
});

export default styles;
