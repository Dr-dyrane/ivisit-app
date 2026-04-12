import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
	bodyScrollViewport: {
		flex: 1,
	},
	bodyScrollContent: {
		paddingHorizontal: 14,
		paddingTop: 2,
		paddingBottom: 6,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		paddingBottom: 12,
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
		fontSize: 24,
		lineHeight: 28,
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
