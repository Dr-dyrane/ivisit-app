import { StyleSheet, Dimensions } from "react-native";
import { COLORS } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    backdropPress: {
        flex: 1,
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 12,
        minHeight: 320,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: "#E5E7EB",
        borderRadius: 100,
        alignSelf: "center",
        marginBottom: 24,
    },
    content: {
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 12,
        textAlign: "center",
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
        marginBottom: 28,
        paddingHorizontal: 16,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        shadowColor: COLORS.brandPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
    },
    laterButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    laterText: {
        fontSize: 15,
        fontWeight: "600",
    },
    fullWidthButton: {
        width: '100%',
    },
    versionContainer: {
        marginBottom: 24,
    },
    versionText: {
        textAlign: "center",
        fontSize: 12,
    },
    buttonGap: {
        gap: 12,
    }
});
