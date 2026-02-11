import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import EmptyState from "./EmptyState";

export default function SearchResultsList({ results, query, onResultPress }) {
    const { isDarkMode } = useTheme();

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        divider: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    };

    if (!results || results.length === 0) {
        return (
            <EmptyState
                icon="search"
                title="No providers found"
                subtitle="Try adjusting your search terms or location"
            />
        );
    }

    return (
        <View style={{ gap: 20 }}>
            {/* Header */}
            <View style={styles.resultsHeader}>
                <Text style={[styles.resultsTitle, { color: colors.text }]}>
                    Available Providers
                </Text>
                <View style={[styles.resultsCount, { backgroundColor: COLORS.brandPrimary + "20" }]}>
                    <Text style={[styles.countText, { color: COLORS.brandPrimary }]}>
                        {results.length} FOUND
                    </Text>
                </View>
            </View>

            {/* List */}
            {results.map((item) => (
                <Pressable
                    key={item.key}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onResultPress(query);
                        item.onPress?.();
                    }}
                    style={({ pressed }) => [
                        styles.providerCard,
                        {
                            backgroundColor: colors.cardBg,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                    ]}
                >
                    {/* Provider Header */}
                    <View style={styles.providerCardHeader}>
                        <View style={styles.providerInfo}>
                            <View style={[styles.providerAvatar, { backgroundColor: COLORS.brandPrimary + "15" }]}>
                                <Ionicons name={item.icon} size={24} color={COLORS.brandPrimary} />
                            </View>
                            <View style={styles.providerDetails}>
                                <Text style={[styles.providerName, { color: colors.text }]}>
                                    {item.title}
                                </Text>
                                {item.subtitle ? (
                                    <Text style={[styles.providerRole, { color: colors.textMuted }]}>
                                        {item.subtitle}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        <View style={styles.providerMeta}>
                            <View style={[styles.metaPill, { backgroundColor: COLORS.brandPrimary + "15" }]}>
                                <Ionicons name="location" size={12} color={COLORS.brandPrimary} />
                                <Text style={[styles.metaText, { color: COLORS.brandPrimary }]}>
                                    NEARBY
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Service Stats */}
                    <View style={styles.serviceStats}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>AVAILABLE</Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>STATUS</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {item.score > 100 ? "TOP" : "GOOD"}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MATCH</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>NOW</Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>RESPONSE</Text>
                        </View>
                    </View>

                    {/* Action Footer */}
                    <View style={[styles.providerFooter, { borderTopColor: colors.divider }]}>
                        <Text style={[styles.actionText, { color: colors.textMuted }]}>
                            TAP TO VIEW DETAILS AND BOOK
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>

                    {/* Corner Seal */}
                    <View style={styles.cornerSeal}>
                        <Ionicons name="checkmark-circle" size={28} color={COLORS.brandPrimary} />
                    </View>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    resultsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    resultsCount: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    providerCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    providerCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    providerInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    providerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    providerDetails: {
        flex: 1,
    },
    providerName: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
    },
    providerRole: {
        fontSize: 13,
    },
    providerMeta: {
        alignItems: "flex-end",
    },
    metaPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    metaText: {
        fontSize: 10,
        fontWeight: "700",
    },
    serviceStats: {
        flexDirection: "row",
        marginBottom: 16,
        backgroundColor: "rgba(0,0,0,0.02)",
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: "600",
    },
    providerFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
    },
    actionText: {
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    cornerSeal: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "white",
        borderRadius: 20,
    },
});
