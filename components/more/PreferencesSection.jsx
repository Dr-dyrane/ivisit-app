import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';

const PreferencesSection = ({ isDarkMode, toggleTheme, handleLogout, colors }) => {
    return (
        <View>
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "900",
                    color: colors.textMuted,
                    marginBottom: 16,
                    letterSpacing: 3,
                }}
            >
                PREFERENCES
            </Text>

            {/* Theme Toggle - Hidden on Android */}
            {Platform.OS !== "android" && (
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleTheme();
                    }}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 20,
                        marginBottom: 12,
                        backgroundColor: colors.card,
                        borderRadius: 30,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDarkMode ? 0 : 0.03,
                        shadowRadius: 10,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 16,
                                backgroundColor: COLORS.brandPrimary,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 16,
                            }}
                        >
                            <Ionicons
                                name={isDarkMode ? "moon" : "sunny"}
                                size={26}
                                color="#FFFFFF"
                            />
                        </View>
                        <View>
                            <Text
                                style={{
                                    fontSize: 19,
                                    fontWeight: "900",
                                    color: colors.text,
                                    letterSpacing: -0.5,
                                }}
                            >
                                {isDarkMode ? "Dark Mode" : "Light Mode"}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.textMuted,
                                    marginTop: 2,
                                }}
                            >
                                Tap to toggle
                            </Text>
                        </View>
                    </View>
                    <View
                        style={{
                            width: 52,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: isDarkMode ? COLORS.brandPrimary : "#D1D5DB",
                            justifyContent: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: "#FFFFFF",
                                position: "absolute",
                                left: isDarkMode ? 25 : 3,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 3,
                                elevation: 3,
                            }}
                        />
                    </View>
                </TouchableOpacity>
            )}

            {/* Logout */}
            <TouchableOpacity
                onPress={handleLogout}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 20,
                    backgroundColor: colors.card,
                    borderRadius: 30,
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
                        borderRadius: 16,
                        backgroundColor: COLORS.error,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                    }}
                >
                    <Ionicons name="log-out-outline" size={26} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 19,
                            fontWeight: "900",
                            color: colors.text,
                            letterSpacing: -0.5,
                        }}
                    >
                        Sign Out
                    </Text>
                    <Text
                        style={{
                            fontSize: 14,
                            color: colors.textMuted,
                            marginTop: 2,
                        }}
                    >
                        Log out of your account
                    </Text>
                </View>
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
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

export default memo(PreferencesSection);
