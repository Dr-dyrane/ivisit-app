import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { styles } from "./HelpSupportScreen.styles";

export default function FaqItem({ item, isExpanded, onToggle, colors, isDarkMode }) {
    return (
        <Pressable
            onPress={() => onToggle(item.id)}
            style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
        >
            <View
                style={[
                    styles.faqCard,
                    {
                        backgroundColor: colors.card,
                        shadowOpacity: isDarkMode ? 0.1 : 0.03,
                    },
                ]}
            >
                <View style={styles.faqHeader}>
                    <View style={styles.faqQuestionContainer}>
                        <Text style={[styles.faqQuestion, { color: colors.text }]}>
                            {item.question}
                        </Text>
                    </View>
                    <View style={[
                        styles.faqIconContainer,
                        { backgroundColor: isExpanded ? COLORS.brandPrimary : colors.highlight }
                    ]}>
                        <Ionicons
                            name={isExpanded ? "remove" : "add"}
                            size={20}
                            color={isExpanded ? "#FFFFFF" : colors.textMuted}
                        />
                    </View>
                </View>
                {isExpanded && (
                    <View>
                        <Text style={[styles.faqAnswer, { color: colors.textMuted }]}>
                            {item.answer}
                        </Text>
                        {item.category && (
                            <View style={styles.faqCategoryContainer}>
                                <Text style={styles.faqCategory}>
                                    {item.category}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </Pressable>
    );
}
