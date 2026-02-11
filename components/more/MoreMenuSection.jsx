import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';

const MoreMenuSection = ({ title, items, colors, isDarkMode }) => {
    return (
        <View>
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: colors.textMuted,
                    marginBottom: 16,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                }}
            >
                {title}
            </Text>
            {items.map((item, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        item.action();
                    }}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 20,
                        marginBottom: 12,
                        backgroundColor: colors.card,
                        borderRadius: 36,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDarkMode ? 0 : 0.03,
                        shadowRadius: 10,
                    }}
                >
                    <View
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            backgroundColor: isDarkMode
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.03)", // Default icon bg
                            // If it's a health item, it used COLORS.brandPrimary in the original code, 
                            // but here we generalize. Let's see if we can pass iconBgColor or check icon name.
                            // In original code: Health items used COLORS.brandPrimary. Settings used light/dark bg.
                            // Let's assume standard behavior unless overridden.
                            backgroundColor: ['fitness-outline', 'people-outline', 'shield-checkmark-outline'].includes(item.icon) 
                                ? COLORS.brandPrimary 
                                : (isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 16,
                        }}
                    >
                        <Ionicons 
                            name={item.icon} 
                            size={26} 
                            color={['fitness-outline', 'people-outline', 'shield-checkmark-outline'].includes(item.icon) ? "#FFFFFF" : colors.text} 
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 19,
                                fontWeight: "900",
                                color: colors.text,
                                letterSpacing: -1.0,
                            }}
                        >
                            {item.title}
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: colors.textMuted,
                                marginTop: 2,
                            }}
                        >
                            {item.description}
                        </Text>
                    </View>
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 14,
                            backgroundColor: isDarkMode
                                ? "rgba(255,255,255,0.025)"
                                : "rgba(0,0,0,0.025)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.textMuted}
                        />
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
};

export default memo(MoreMenuSection);
