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
    Platform,
    Dimensions,
    StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
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
        const dismissAction = action || (isCompleted ? onDismiss : onLater);
        if (!dismissAction) return;

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
        ]).start(() => dismissAction());
    };

    const colors = {
        bg: isDarkMode ? "rgba(8,15,27,0.92)" : "rgba(255,255,255,0.92)",
        text: isDarkMode ? "#F8FAFC" : "#0F172A",
        subtext: isDarkMode ? "rgba(226,232,240,0.72)" : "rgba(71,85,105,0.76)",
        card: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
        laterBtn: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.07)",
        closeBg: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.64)",
    };

    const modalContent = (
        <>
            <View style={styles.indicator} />

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close update message"
                onPress={() => handleDismiss(isCompleted ? onDismiss : onLater)}
                style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: colors.closeBg, opacity: pressed ? 0.72 : 1 },
                ]}
            >
                <Ionicons name="close" size={19} color={colors.text} />
            </Pressable>

            <View style={styles.content}>
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            backgroundColor: isCompleted
                                ? (isDarkMode ? "rgba(16,185,129,0.16)" : "#D1FAE5")
                                : colors.card,
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                >
                    <Ionicons
                        name={isCompleted ? "checkmark" : "arrow-down-circle"}
                        size={28}
                        color={isCompleted ? "#10B981" : COLORS.brandPrimary}
                    />
                </Animated.View>

                <Text style={[styles.title, { color: colors.text }]}>
                    {isCompleted ? "You're up to date" : "Update ready"}
                </Text>

                <Text style={[styles.description, { color: colors.subtext }]}>
                    {isCompleted
                        ? `iVisit is now running version ${VERSION}.`
                        : "Restart to apply the latest improvements."
                    }
                </Text>

                {isCompleted ? (
                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            styles.fullWidthButton,
                            {
                                backgroundColor: COLORS.brandPrimary,
                                opacity: pressed ? 0.9 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            },
                        ]}
                        onPress={() => handleDismiss(onDismiss || onLater)}
                    >
                        <Text style={styles.buttonText}>Done</Text>
                    </Pressable>
                ) : (
                    <View style={styles.actionRow}>
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
                            <Text style={[styles.laterText, { color: colors.text }]}>Later</Text>
                        </Pressable>

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
                            <Ionicons name="refresh" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.buttonText}>Restart</Text>
                        </Pressable>
                    </View>
                )}

                <Text style={[styles.versionText, { color: colors.subtext }]}>
                    Version {VERSION}
                </Text>
            </View>
        </>
    );

    return (
        <Modal visible={visible} transparent animationType="none">
            <View style={styles.container}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <Pressable
                        style={styles.backdropPress}
                        onPress={() => handleDismiss(isCompleted ? onDismiss : onLater)}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: colors.bg,
                            paddingBottom: insets.bottom + 12,
                        },
                    ]}
                >
                    {Platform.OS === "ios" ? (
                        <BlurView
                            intensity={isDarkMode ? 42 : 56}
                            tint={isDarkMode ? "dark" : "light"}
                            style={StyleSheet.absoluteFill}
                        />
                    ) : null}
                    {modalContent}
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
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
        padding: 20,
        paddingTop: 12,
        minHeight: 268,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: "rgba(148,163,184,0.34)",
        borderRadius: 100,
        alignSelf: "center",
        marginBottom: 16,
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 18,
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
    },
    content: {
        alignItems: "center",
        marginBottom: 0,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    title: {
        fontSize: 22,
        lineHeight: 27,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        marginBottom: 20,
        paddingHorizontal: 28,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        gap: 10,
    },
    button: {
        flex: 1,
        minHeight: 50,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    buttonText: {
        color: "white",
        fontSize: 15,
        lineHeight: 19,
        fontWeight: "700",
    },
    laterButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    laterText: {
        fontSize: 15,
        lineHeight: 19,
        fontWeight: "700",
    },
    fullWidthButton: {
        width: '100%',
    },
    versionText: {
        marginTop: 14,
        textAlign: "center",
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "500",
    },
});
