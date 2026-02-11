import { StyleSheet } from "react-native";

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
    sectionTitle: {
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 3,
        textTransform: "uppercase",
    },
    helperRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 8 },
    helperText: { fontSize: 13, fontWeight: "500" },
    saveButton: {
        marginTop: 8,
        height: 54,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "900"
    }
});
