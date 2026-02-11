import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
    mockTokenContainer: {
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    mockTokenLabel: {
        fontSize: 12,
        textAlign: "center",
        marginBottom: 4,
    },
    mockTokenValue: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        letterSpacing: 8,
    },
    errorContainer: {
        backgroundColor: `${COLORS.error}15`,
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.error,
    },
    errorRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    errorIcon: {
        marginRight: 8,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 13,
        fontWeight: "400",
        flex: 1,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        paddingHorizontal: 20,
        height: 72,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: "bold",
    },
    tokenInput: {
        letterSpacing: 8,
    },
    submitButton: {
        height: 64,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: "900",
        letterSpacing: 2,
    },
    validationText: {
        marginTop: 12,
        fontSize: 12,
        textAlign: "center",
        color: COLORS.textMuted,
    },
});
