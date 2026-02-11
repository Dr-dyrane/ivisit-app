// components/emergency/LocationPermissionError.jsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export default function LocationPermissionError({ isDarkMode, onRequestPermission }) {
    return (
        <View style={[styles.container, styles.errorContainer, { backgroundColor: isDarkMode ? "#0B0F1A" : "#F8FAFC" }]}>
            <Ionicons name="location-outline" size={48} color={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted} />
            <Text style={[styles.errorText, { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }]}>
                Location permission required
            </Text>
            <Text style={[styles.errorSubtext, { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }]}>
                Enable location to see nearby hospitals
            </Text>
            <Pressable
                style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
                onPress={onRequestPermission}
            >
                <Text style={styles.retryButtonText}>Enable Location</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    errorContainer: {
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        fontWeight: "400",
        textAlign: "center",
        marginTop: 16,
        marginBottom: 4,
    },
    errorSubtext: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 20,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 8,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
});
