import { StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 30,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	title: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
	subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, fontWeight: '400' },
    closeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    noPasswordButton: {
        marginTop: 12,
        height: 54,
        borderRadius: 22,
        backgroundColor: COLORS.brandPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    noPasswordButtonText: {
        color: "#FFFFFF",
        fontWeight: "900",
        fontSize: 15,
    },
});
