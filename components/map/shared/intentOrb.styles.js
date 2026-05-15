import { StyleSheet } from "react-native";

export default StyleSheet.create({
	action: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
		paddingVertical: 2,
		paddingHorizontal: 1,
	},
	actionPressed: {
		opacity: 0.88,
	},
	iconShadowWrap: {
		width: 88,
		height: 88,
		borderRadius: 44,
		marginBottom: 10,
	},
	iconWrap: {
		width: 88,
		height: 88,
		borderRadius: 44,
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	label: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "700",
		textAlign: "center",
		maxWidth: "100%",
		flexShrink: 1,
	},
	subtext: {
		marginTop: 3,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		textAlign: "center",
		maxWidth: "100%",
		flexShrink: 1,
	},
});
