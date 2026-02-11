import { StyleSheet } from "react-native";
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
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
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
        backgroundColor: "rgba(107, 114, 128, 0.2)", // gray-500/20
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
        padding: 8,
        backgroundColor: "rgba(107, 114, 128, 0.1)", // gray-500/10
        borderRadius: 9999, // rounded-full
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
        padding: 8,
        backgroundColor: "rgba(107, 114, 128, 0.1)", // gray-500/10
        borderRadius: 9999, // rounded-full
    },
    errorContainer: {
        backgroundColor: `${COLORS.error}15`,
        padding: 16,
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
        fontSize: 14,
        fontWeight: "400",
        flex: 1,
    },
});
