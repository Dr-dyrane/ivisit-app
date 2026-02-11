import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 10,
    },
    sectionHeader: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    optionsGrid: {
        gap: 16,
    },
    optionCard: {
        padding: 24,
        borderRadius: 36, // Ultra rounded
        minHeight: 170, // Vertical space
        justifyContent: "space-between",
        position: "relative",
        // Depth instead of borders
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    price: {
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    perNight: {
        fontSize: 12,
        fontWeight: "600",
        opacity: 0.6,
    },
    cardBody: {
        marginTop: 8,
    },
    optionName: {
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 6,
    },
    optionDesc: {
        fontSize: 13,
        lineHeight: 18,
        maxWidth: "80%",
    },
    checkmarkWrapper: {
        position: "absolute",
        right: 12,
        bottom: 12,
    },
    counterCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 24,
        borderRadius: 32,
        marginTop: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
    },
    countLabel: {
        fontSize: 16,
        fontWeight: "800",
    },
    countSub: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.7,
    },
    counterControls: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.03)",
        padding: 6,
        borderRadius: 20,
        gap: 12,
    },
    counterBtn: {
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    countValue: {
        fontSize: 20,
        fontWeight: "800",
        minWidth: 24,
        textAlign: "center",
    },
});
