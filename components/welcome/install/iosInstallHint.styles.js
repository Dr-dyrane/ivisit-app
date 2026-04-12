import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	card: {
		width: "100%",
		borderRadius: 22,
		paddingHorizontal: 14,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
	},
	cardCompact: {
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	iconWrap: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 1,
	},
	copy: {
		flex: 1,
	},
	title: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
		letterSpacing: -0.1,
	},
	body: {
		marginTop: 3,
		fontSize: 12,
		lineHeight: 17,
		fontWeight: "500",
	},
	guideButton: {
		marginTop: 10,
		minHeight: 34,
		paddingHorizontal: 12,
		borderRadius: 14,
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 6,
	},
	guideButtonText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "700",
	},
	dismissButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
});

export default styles;
