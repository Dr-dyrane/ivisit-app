// components/settings/SettingsItem.jsx

import React, { memo } from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

const SettingsItem = memo(({
    icon,
    title,
    subtitle,
    type = "switch", // "switch" | "link"
    value = false,
    onPress,
    disabled = false,
    isDarkMode,
    colors,
}) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                marginBottom: 12,
                backgroundColor: colors.card,
                borderRadius: 36,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDarkMode ? 0 : 0.03,
                shadowRadius: 10,
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
                    <Ionicons name={icon} size={26} color="#FFFFFF" />
                </View>
                <View>
                    <Text
                        style={{
                            fontSize: 19,
                            fontWeight: "900",
                            color: colors.text,
                            letterSpacing: -1.0,
                        }}
                    >
                        {title}
                    </Text>
                    {subtitle && (
                        <Text
                            style={{
                                fontSize: 14,
                                color: colors.textMuted,
                                marginTop: 2,
                                fontWeight: "500",
                            }}
                        >
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>

            {type === "switch" ? (
                <View
                    style={{
                        width: 52,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: value ? COLORS.brandPrimary : "#D1D5DB",
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
                            left: value ? 25 : 3,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: 3,
                        }}
                    />
                </View>
            ) : (
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        backgroundColor: isDarkMode
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                    />
                </View>
            )}
        </TouchableOpacity>
    );
});

export default SettingsItem;
