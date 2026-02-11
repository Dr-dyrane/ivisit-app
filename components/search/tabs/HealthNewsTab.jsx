import React from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../SuggestiveContent.styles";
import { COLORS } from "../../../constants/colors";
import { discoveryService } from "../../../services/discoveryService";

const HealthNewsTab = ({ items, loading, colors, isDarkMode }) => {
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
                <Text style={{ color: colors.textMuted }}>No health news available.</Text>
            </View>
        );
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {items.map((item) => (
                <Pressable 
                    key={item.id} 
                    onPress={() => {
                        discoveryService.trackSearchSelection({
                            query: item.title,
                            source: 'health_news_tab',
                            resultType: 'health_news',
                            resultId: item.id,
                        });
                    }}
                    style={({ pressed }) => [
                        styles.newsCard,
                        { 
                            backgroundColor: colors.cardBg,
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                        }
                    ]}
                >
                    <View style={styles.newsHeaderRow}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.brandPrimary }]}>
                            <Ionicons name={item.icon || 'newspaper'} size={16} color="#FFFFFF" />
                        </View>
                        <View style={styles.newsMeta}>
                            <Text style={[styles.newsSource, { color: COLORS.brandPrimary }]}>
                                {item.source}
                            </Text>
                            <Text style={[styles.newsTime, { color: colors.textMuted }]}>
                                {item.time}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.newsTitleText, { color: colors.text }]} numberOfLines={3}>
                        {item.title}
                    </Text>
                    <View style={[
                        styles.checkmarkWrapper,
                        {
                            backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
                        }
                    ]}>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.brandPrimary} />
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
};

export default HealthNewsTab;
