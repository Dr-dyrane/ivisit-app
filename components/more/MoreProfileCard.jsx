import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';

const MoreProfileCard = ({ user, colors, isDarkMode, onPress }) => {
    return (
        <TouchableOpacity
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onPress();
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
            <View>
                <Image
                    source={
                        user?.imageUri
                            ? { uri: user.imageUri }
                            : require("../../assets/profile.jpg")
                    }
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 24,
                        backgroundColor: COLORS.brandPrimary + "15",
                    }}
                />
                {user?.hasInsurance && (
                    <View
                        style={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            backgroundColor: COLORS.brandPrimary,
                            borderRadius: 10,
                            width: 20,
                            height: 20,
                            justifyContent: "center",
                            alignItems: "center",
                            borderWidth: 2,
                            borderColor: colors.card,
                        }}
                    >
                        <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                    </View>
                )}
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
                <Text
                    style={{
                        fontSize: 19,
                        fontWeight: "900",
                        color: colors.text,
                        letterSpacing: -1.0,
                    }}
                >
                    {user?.fullName || user?.username || "User"}
                </Text>
                <Text
                    style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}
                >
                    {user?.email || "email@example.com"}
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
    );
};

export default memo(MoreProfileCard);
