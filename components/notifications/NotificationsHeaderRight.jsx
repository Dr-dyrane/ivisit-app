import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ActionWrapper from "../headers/ActionWrapper";
import { COLORS } from "../../constants/colors";

const NotificationsHeaderRight = ({
    isSelectMode,
    unreadCount,
    selectedCount,
    totalCount,
    isDarkMode,
    onToggleSelectMode,
    onSelectAll,
    onClearSelection,
    onMarkSelectedRead,
    onDeleteSelected,
    onMarkAllRead
}) => {
    if (isSelectMode) {
        return (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {/* Select All */}
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (selectedCount === totalCount) {
                            onClearSelection();
                        } else {
                            onSelectAll();
                        }
                    }}
                    style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                    })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={{ 
                        color: isDarkMode ? COLORS.textLight : COLORS.textPrimary, 
                        fontSize: 14, 
                        fontWeight: "500" 
                    }}>
                        {selectedCount === totalCount ? "Deselect All" : "Select All"}
                    </Text>
                </Pressable>
                
                {/* Mark as Read */}
                {selectedCount > 0 && (
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onMarkSelectedRead();
                        }}
                        style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                        })}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ActionWrapper>
                            <Ionicons
                                name="checkmark-done"
                                size={24}
                                color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
                            />
                        </ActionWrapper>
                    </Pressable>
                )}
                
                {/* Delete */}
                {selectedCount > 0 && (
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            Alert.alert(
                                "Delete Notifications",
                                `Are you sure you want to delete ${selectedCount} notification${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
                                [
                                    {
                                        text: "Cancel",
                                        style: "cancel",
                                    },
                                    {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: onDeleteSelected,
                                    },
                                ],
                                { cancelable: true }
                            );
                        }}
                        style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                        })}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ActionWrapper>
                            <Ionicons
                                name="trash"
                                size={24}
                                color="#EF4444"
                            />
                        </ActionWrapper>
                    </Pressable>
                )}
                
                {/* Close Select Mode */}
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onToggleSelectMode();
                    }}
                    style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                    })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ActionWrapper>
                        <Ionicons
                            name="close"
                            size={24}
                            color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
                        />
                    </ActionWrapper>
                </Pressable>
            </View>
        );
    }
    
    return unreadCount > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Select Mode Toggle */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onToggleSelectMode();
                }}
                style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <ActionWrapper>
                    <Ionicons
                        name="checkbox-outline"
                        size={24}
                        color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
                    />
                </ActionWrapper>
            </Pressable>
            
            {/* Mark All as Read */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onMarkAllRead();
                }}
                style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <ActionWrapper>
                    <Ionicons
                        name="checkmark-done"
                        size={24}
                        color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
                    />
                </ActionWrapper>
            </Pressable>
        </View>
    ) : null;
};

export default NotificationsHeaderRight;
