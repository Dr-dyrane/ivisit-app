import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../constants/colors";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        padding: 20,
        gap: 12,
    },
    card: {
        borderRadius: 32,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: "500",
        opacity: 0.8,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        height: 60,
        borderRadius: 20,
        paddingHorizontal: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
    },
    errorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    errorText: {
        fontSize: 13,
        fontWeight: "600",
        flex: 1,
    },
    submitButton: {
        height: 64,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: COLORS.brandPrimary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    closeButton: {
        marginRight: 8,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        justifyContent: "center",
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
        fontSize: 15
    }
});
