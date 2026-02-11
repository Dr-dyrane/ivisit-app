// components/emergency/SelectionToolbar.jsx
import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";

export default function SelectionToolbar({
    selectedCount,
    onClear,
    onDelete,
    isDarkMode,
}) {
    if (selectedCount === 0) return null;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: STACK_TOP_PADDING + 60,
                left: 12,
                right: 12,
                zIndex: 1000,
                backgroundColor: isDarkMode ? '#0B0F1A' : '#FFFFFF',
                borderRadius: 24,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: COLORS.brandPrimary,
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 16,
                elevation: 8,
                borderColor: COLORS.brandPrimary + '40',
                borderWidth: 1,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.brandPrimary} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
                    {selectedCount} selected
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                    onPress={onClear}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                    }}
                >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
                        Clear
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onDelete}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    }}
                >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.error }}>
                        Delete
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}
