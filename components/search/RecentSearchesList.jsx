import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import EmptyState from "./EmptyState";

export default function RecentSearchesList({ queries, onSelectQuery }) {
    const { isDarkMode } = useTheme();

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    };

    if (!queries || queries.length === 0) {
        return (
            <EmptyState
                icon="time-outline"
                title="No recent searches"
                subtitle="Your search history will appear here"
            />
        );
    }

    return (
        <View>
            <View style={styles.recentHeader}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>
                    Recent Searches
                </Text>
                <Text style={[styles.recentSubtitle, { color: colors.textMuted }]}>
                    Your healthcare discovery history
                </Text>
            </View>

            <View style={{ gap: 12 }}>
                {queries.map((item, index) => (
                    <Pressable
                        key={item}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelectQuery(item);
                        }}
                        style={({ pressed }) => [
                            styles.recentCard,
                            {
                                backgroundColor: colors.cardBg,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            },
                        ]}
                    >
                        <View style={styles.recentCardHeader}>
                            <View style={styles.recentInfo}>
                                <View style={[styles.recentAvatar, { backgroundColor: COLORS.brandPrimary + "15" }]}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.brandPrimary} />
                                </View>
                                <View style={styles.recentDetails}>
                                    <Text style={[styles.recentName, { color: colors.text }]}>
                                        {item}
                                    </Text>
                                    <Text style={[styles.recentRole, { color: colors.textMuted }]}>
                                        SEARCH #{queries.length - index}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.recentMeta}>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </View>
                        </View>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    recentHeader: {
        marginBottom: 16,
    },
    recentTitle: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    recentSubtitle: {
        fontSize: 13,
    },
    recentCard: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    recentCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    recentInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    recentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    recentDetails: {
        flex: 1,
    },
    recentName: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    recentRole: {
        fontSize: 10,
        fontWeight: "600",
    },
    recentMeta: {
        marginLeft: 8,
    },
});
