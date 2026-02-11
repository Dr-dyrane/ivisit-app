import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../SuggestiveContent.styles";

const QuickActionsTab = ({ items, colors, isDarkMode, onItemSelect }) => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {items.map(item => (
                <Pressable 
                    key={item.id} 
                    onPress={() => item.isEmergency ? onItemSelect("emergency", item) : onItemSelect(item.query, item)}
                    style={({ pressed }) => [
                        styles.horizontalCard,
                        { 
                            backgroundColor: item.color + (isDarkMode ? "20" : "10"),
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                        }
                    ]}
                >
                    <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon} size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.textStack}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                            {item.subtitle}
                        </Text>
                    </View>
                    <View style={[
                        styles.checkmarkWrapper,
                        {
                            backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
                        }
                    ]}>
                        <Ionicons name="arrow-forward" size={18} color={item.color} />
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
};

export default QuickActionsTab;
