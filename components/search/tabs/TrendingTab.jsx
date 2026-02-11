import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../SuggestiveContent.styles";
import { COLORS } from "../../../constants/colors";

const TrendingTab = ({ items, loading, colors, isDarkMode, onItemSelect }) => {
    if (loading) {
        return (
            <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.brandPrimary} />
            </View>
        );
    }

    if (!items.length) {
        return (
            <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted }}>No trending searches yet.</Text>
            </View>
        );
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {items.map((item) => (
                <Pressable 
                    key={item.query} 
                    onPress={() => onItemSelect(item.query, item)}
                    style={({ pressed }) => [
                        styles.horizontalCard,
                        { 
                            backgroundColor: colors.cardBg,
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                        }
                    ]}
                >
                    <View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>#{item.rank}</Text>
                    </View>
                    <View style={styles.textStack}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.query}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                            {item.count} searches
                        </Text>
                    </View>
                    <View style={[
                        styles.checkmarkWrapper,
                        {
                            backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
                        }
                    ]}>
                        <Ionicons name="trending-up" size={18} color={COLORS.brandPrimary} />
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
};

export default TrendingTab;
