import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
	sheet: {
		zIndex: 1000,
		elevation: 1000,
	},
	sheetBackground: {
		borderTopLeftRadius: 36,
		borderTopRightRadius: 36,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -6 },
		shadowOpacity: 0.12,
		shadowRadius: 20,
		elevation: 20,
	},
	handleContainer: {
		paddingTop: 8,
		paddingBottom: 0,
		alignItems: "center",
		borderTopLeftRadius: 48,
		borderTopRightRadius: 48,
	},
	handle: {
		width: 40,
		height: 5,
		borderRadius: 3,
	},
	scrollContent: {
		paddingHorizontal: 12,
		paddingTop: 8,
	},
	sectionHeader: {
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 2,
		marginBottom: 14,
		textTransform: "uppercase",
	},
	headerWithReset: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		marginBottom: 8,
	},
	resetButton: {
		fontSize: 10,
		fontWeight: "500",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
});
