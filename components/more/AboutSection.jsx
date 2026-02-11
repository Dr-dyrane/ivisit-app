import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';

const AboutSection = ({ openLink, colors, isDarkMode }) => {
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
                ABOUT
            </Text>
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openLink("https://ivisit.ng");
                }}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 20,
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
                        backgroundColor: COLORS.brandPrimary,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                    }}
                >
                    <Ionicons name="heart" size={24} color="#FFFFFF" />
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
                        Healthcare, thoughtfully engineered
                    </Text>
                    <Text
                        style={{
                            fontSize: 14,
                            color: colors.textMuted,
                            marginTop: 2,
                        }}
                    >
                        Crafted in California • ivisit.ng
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

            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openLink("https://ivisit.ng/privacy");
                }}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 20,
                    marginTop: 12,
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
                            : "rgba(0,0,0,0.03)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                    }}
                >
                    <Ionicons name="document-text-outline" size={24} color={colors.text} />
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
                        Terms & Privacy
                    </Text>
                    <Text
                        style={{
                            fontSize: 14,
                            color: colors.textMuted,
                            marginTop: 2,
                        }}
                    >
                        Read policies and legal information
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
        </View>
    );
};

export default memo(AboutSection);
