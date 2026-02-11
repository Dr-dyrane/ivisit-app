import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
    },
    emptyState: {
        padding: 32,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
        textAlign: "center",
    },
    emptyText: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
});
