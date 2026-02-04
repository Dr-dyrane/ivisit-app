/**
 * UpdateAvailableModal
 * 
 * Non-intrusive bottom sheet for OTA update notifications.
 * Supports two variants:
 * - 'available': Shows restart/later options for pending updates
 * - 'completed': Shows success confirmation after update applied
 * Follows UX Canon: calm feedback, one dominant action, dismissible.
 */
import { useEffect, useRef } from "react";
import {
    View,
    Text,
    Modal,
    Animated,
    Pressable,
    Dimensions,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";
import VERSION from "../../version";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    const isCompleted = variant === 'completed';
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let pulseAnimation = null;

        if (visible) {
            // Soft notification haptic - not alarming
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Subtle pulse on icon - store reference for cleanup
            pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();
        }

        // Cleanup: stop animation loop when modal closes or unmounts
        return () => {
            if (pulseAnimation) {
                pulseAnimation.stop();
            }
            // Reset pulse to default value
            pulseAnim.setValue(1);
        };
    }, [visible]);

    const handleDismiss = (action) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => action());
    };

    const colors = {
        bg: isDarkMode ? "#111827" : "#FFFFFF",
        text: isDarkMode ? "#F9FAFB" : "#111827",
        subtext: isDarkMode ? "#9CA3AF" : "#6B7280",
        card: isDarkMode ? "#1F2937" : "#F3F4F6",
        laterBtn: isDarkMode ? "#374151" : "#E5E7EB",
    };

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
                            <View className="flex-row items-center w-full" style={{ gap: 12 }}>
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

                    <View
                        style={{
                            marginBottom: 24,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.subtext,
                                textAlign: "center",
                                fontSize: 12,
                            }}
                        >Version {VERSION}</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    backdropPress: {
        flex: 1,
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 12,
        minHeight: 320,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: "#E5E7EB",
        borderRadius: 100,
        alignSelf: "center",
        marginBottom: 24,
    },
    content: {
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 12,
        textAlign: "center",
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
        marginBottom: 28,
        paddingHorizontal: 16,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        shadowColor: COLORS.brandPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
    },
    laterButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    laterText: {
        fontSize: 15,
        fontWeight: "600",
    },
    fullWidthButton: {
        width: '100%',
    },
});
