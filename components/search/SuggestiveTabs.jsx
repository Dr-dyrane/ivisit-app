import React from "react";
import { Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./SuggestiveContent.styles";

const SuggestiveTabs = ({ tabs, activeTab, colors, onTabChange }) => {
    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tabScroll}
            contentContainerStyle={styles.tabContainer}
        >
            {tabs.map(tab => (
                <Pressable
                    key={tab.id}
                    onPress={() => onTabChange(tab.id)}
                    style={({ pressed }) => [
                        styles.tabButton,
                        { 
                            backgroundColor: activeTab === tab.id ? colors.tabActive : colors.tabInactive,
                            transform: [{ scale: pressed ? 0.95 : 1 }]
                        }
                    ]}
                >
                    <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? "#FFFFFF" : colors.textMuted} style={{ marginRight: 8 }} />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === tab.id ? "#FFFFFF" : colors.textMuted }
                    ]}>
                        {tab.label}
                    </Text>
                </Pressable>
            ))}
        </ScrollView>
    );
};

export default SuggestiveTabs;
