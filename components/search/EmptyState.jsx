import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

export default function EmptyState({ icon, title, subtitle }) {
    const { isDarkMode } = useTheme();

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    };

    return (
        <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
            <Ionicons name={icon} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {title}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {subtitle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        borderRadius: 16,
        padding: 32,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
});
