import { StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { AUTH_LAYOUT } from "../constants/layout";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 20,
    },
    mainContent: {
        paddingHorizontal: 32,
        paddingBottom: 16,
    },
    headerText: {
        fontSize: 44,
        fontWeight: "900",
        lineHeight: 48,
        marginBottom: 12,
        letterSpacing: -1.5,
    },
    subtitleText: {
        fontSize: 16,
        marginBottom: 48,
        lineHeight: 24,
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 40,
    },
    dividerLine: {
        flex: 1,
        height: 2,
        borderRadius: 9999,
    },
    dividerText: {
        paddingHorizontal: 24,
        fontSize: 10,
        textTransform: "uppercase",
        fontWeight: "800",
        letterSpacing: 1.5,
    },
    signupLinkContainer: {
        marginTop: 48,
    },
    signupLinkText: {
        textAlign: "center",
    },
    signupLinkHighlight: {
        fontWeight: "bold",
        color: COLORS.brandPrimary,
    },
    footerContainer: {
        marginTop: AUTH_LAYOUT.sectionGap,
        paddingBottom: 32,
        paddingHorizontal: 32,
    },
    footerText: {
        textAlign: "center",
        fontSize: 10,
        justifyContent: "center",
        color: "#6B7280", // gray-500
    },
    linkText: {
        fontWeight: "900",
        textDecorationLine: "underline",
    },
    locationText: {
        textAlign: "center",
        fontSize: 10,
        color: "#6B7280", // gray-500
        marginTop: 4,
    },
    locationHighlight: {
        color: COLORS.brandPrimary,
        fontWeight: "900",
    },
});
