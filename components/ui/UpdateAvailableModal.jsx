/**
 * UpdateAvailableModal
 * 
 * Non-intrusive bottom sheet for OTA update notifications.
 * Supports two variants:
 * - 'available': Shows restart/later options for pending updates
 * - 'completed': Shows success confirmation after update applied
 * Follows UX Canon: calm feedback, one dominant action, dismissible.
 */
import React from "react";
import {
    View,
    Text,
    Modal,
    Animated,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import VERSION from "../../version";
import { useUpdateAvailableModalLogic } from "../../hooks/ui/useUpdateAvailableModalLogic";
import { styles } from "./UpdateAvailableModal.styles";

/**
 * @param {Object} props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {'available' | 'completed'} props.variant - Modal variant type
 * @param {() => void} props.onRestart - Called when user taps Restart (available variant)
 * @param {() => void} props.onLater - Called when user taps Later/dismiss
 * @param {() => void} props.onDismiss - Called when user dismisses (completed variant)
 */
export default function UpdateAvailableModal({
    visible,
    variant = 'available',
    onRestart,
    onLater,
    onDismiss,
}) {
    const { state, actions } = useUpdateAvailableModalLogic({
        visible,
        variant,
        onRestart,
        onLater,
        onDismiss
    });

    const {
        isCompleted,
        insets,
        isDarkMode,
        slideAnim,
        fadeAnim,
        pulseAnim,
        colors
    } = state;

    const { handleDismiss } = actions;

    return (
        <Modal visible={visible} transparent animationType="none">
            <View style={styles.container}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <Pressable style={styles.backdropPress} onPress={() => handleDismiss(onLater)} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: colors.bg,
                            paddingBottom: insets.bottom + 12, // Large bottom padding for premium feel
                        },
                    ]}
                >
                    <View style={styles.indicator} />

                    <View style={styles.content}>
                        {/* Icon with subtle pulse */}
                        <Animated.View
                            style={[
                                styles.iconContainer,
                                {
                                    backgroundColor: isCompleted
                                        ? (isDarkMode ? "#064E3B" : "#D1FAE5")
                                        : (isDarkMode ? "#374151" : "#E5E7EB"),
                                    transform: [{ scale: pulseAnim }],
                                },
                            ]}
                        >
                            <Ionicons
                                name={isCompleted ? "checkmark-circle" : "sparkles"}
                                size={32}
                                color={isCompleted ? "#10B981" : COLORS.brandPrimary}
                            />
                        </Animated.View>

                        <Text style={[styles.title, { color: colors.text }]}>
                            {isCompleted ? "Update Complete" : "Update Ready"}
                        </Text>

                        <Text style={[styles.description, { color: colors.subtext }]}>
                            {isCompleted
                                ? `You're now running the latest version (${VERSION}).`
                                : "Restart now to apply the latest improvements."
                            }
                        </Text>

                        {isCompleted ? (
                            /* Completed variant: single dismiss button */
                            <Pressable
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.fullWidthButton,
                                    {
                                        backgroundColor: "#10B981",
                                        opacity: pressed ? 0.9 : 1,
                                        transform: [{ scale: pressed ? 0.98 : 1 }],
                                    },
                                ]}
                                onPress={() => handleDismiss(onDismiss || onLater)}
                            >
                                <Text style={styles.buttonText}>Got it</Text>
                            </Pressable>
                        ) : (
                            /* Available variant: restart/later buttons */
                            <View style={[styles.buttonGap, { flexDirection: "row", alignItems: "center", width: "100%" }]}>
                                {/* Secondary dismiss */}
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.laterButton,
                                        {
                                            backgroundColor: colors.laterBtn,
                                            opacity: pressed ? 0.8 : 1,
                                        },
                                    ]}
                                    onPress={() => handleDismiss(onLater)}
                                >
                                    <Text style={[styles.laterText, { color: colors.subtext }]}>Later</Text>
                                </Pressable>

                                {/* Primary action */}
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.button,
                                        {
                                            backgroundColor: COLORS.brandPrimary,
                                            opacity: pressed ? 0.9 : 1,
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                        },
                                    ]}
                                    onPress={() => handleDismiss(onRestart)}
                                >
                                    <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.buttonText}>Restart</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    <View style={styles.versionContainer}>
                        <Text
                            style={[styles.versionText, { color: colors.subtext }]}
                        >Version {VERSION}</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}
