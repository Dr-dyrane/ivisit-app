import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-end",
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    pressableOverlay: {
        flex: 1,
    },
    modalContainer: {
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        paddingHorizontal: 32,
        paddingTop: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    handleBar: {
        width: 48,
        height: 6,
        backgroundColor: "rgba(107, 114, 128, 0.1)", // gray-500/10
        borderRadius: 3,
        alignSelf: "center",
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 32,
    },
    backButton: {
        padding: 12,
        backgroundColor: "rgba(107, 114, 128, 0.05)", // gray-500/5
        borderRadius: 16,
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    stepText: {
        fontSize: 10,
        letterSpacing: 3,
        marginBottom: 8,
        textTransform: "uppercase",
        fontWeight: "900",
        color: COLORS.brandPrimary,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: "900",
        letterSpacing: -1,
    },
    closeButton: {
        padding: 12,
        backgroundColor: "rgba(107, 114, 128, 0.05)", // gray-500/5
        borderRadius: 16,
    },
    errorContainer: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 20,
    },
    errorRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    errorIcon: {
        marginRight: 12,
    },
    errorText: {
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
    },
    signUpButton: {
        backgroundColor: COLORS.brandPrimary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 24,
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.brandPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signUpIcon: {
        marginRight: 8,
    },
    signUpText: {
        color: "white",
        fontSize: 15,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    otpFallbackContainer: {
        marginTop: 24,
        alignItems: "center",
    },
    otpFallbackText: {
        color: "#9CA3AF", // gray-400
        fontSize: 14,
        marginBottom: 8,
    },
    resendButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    resendText: {
        color: COLORS.brandPrimary,
        fontWeight: "600",
    },
    passwordOptionsRow: {
        marginTop: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    forgotPasswordButton: {
        paddingVertical: 8,
    },
    forgotPasswordText: {
        color: COLORS.brandPrimary,
        fontWeight: "600",
    },
    switchAuthButton: {
        paddingVertical: 8,
    },
    switchAuthText: {
        color: "#6B7280", // gray-500
        fontWeight: "500",
    },
});
