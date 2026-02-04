import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';

/**
 * ServicePickerModal - Hidden feature accessed via long-press on FAB
 * Bottom sheet that grows upward from FAB position
 */

const SERVICES = [
    {
        id: 'emergency',
        icon: 'alarm-light-outline',
        label: 'Ambulance',
        subtitle: 'Emergency dispatch',
        color: COLORS.emergency,
    },
    {
        id: 'booking',
        icon: 'bed-outline',
        label: 'Book Bed',
        subtitle: 'Reserve hospital bed',
        color: COLORS.brandPrimary,
    },
];

const ServicePickerModal = ({ visible, onClose, onSelectService, currentMode }) => {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

    // Animation values
    const slideAnim = useRef(new Animated.Value(100)).current;
    const scaleXAnim = useRef(new Animated.Value(0.3)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Run entrance animation when visible changes
    useEffect(() => {
        if (visible) {
            // Reset and animate in - grow from bottom-right
            slideAnim.setValue(60);
            scaleXAnim.setValue(0.4);
            opacityAnim.setValue(0);

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 180,
                    friction: 22,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleXAnim, {
                    toValue: 1,
                    tension: 180,
                    friction: 22,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 120,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        // Animate out - shrink back to bottom-right
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 40,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(scaleXAnim, {
                toValue: 0.5,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleSelect = (serviceId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelectService(serviceId);
        handleClose();
    };

    // Bottom aligns with FAB
    const paddingBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 12);
    const fabBottom = paddingBottom + 8;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            {/* Subtle blurred overlay - tap to dismiss */}
            <Pressable style={styles.overlay} onPress={handleClose}>
                <BlurView
                    intensity={isDarkMode ? 12 : 8}
                    tint={isDarkMode ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                >
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)',
                                opacity: opacityAnim,
                            }
                        ]}
                    />
                </BlurView>
            </Pressable>

            {/* Bottom sheet - anchored at FAB bottom, grows left and up */}
            <Animated.View
                style={[
                    styles.sheetWrapper,
                    {
                        bottom: fabBottom,
                        opacity: opacityAnim,
                        transform: [
                            { translateY: slideAnim },
                            { scaleX: scaleXAnim },
                        ],
                    }
                ]}
                pointerEvents="box-none"
            >
                <View style={[
                    styles.sheetContainer,
                    {
                        backgroundColor: isDarkMode
                            ? 'rgba(18, 24, 38, 0.95)'
                            : 'rgba(255, 255, 255, 0.95)',
                    }
                ]}>
                    {/* Handle bar */}
                    <View style={styles.handleWrapper}>
                        <View style={[
                            styles.handle,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
                        ]} />
                    </View>

                    {/* Service options */}
                    <View style={styles.optionsContainer}>
                        {SERVICES.map((service) => {
                            const isActive = service.id === currentMode;

                            return (
                                <TouchableOpacity
                                    key={service.id}
                                    style={[
                                        styles.serviceRow,
                                        isActive && {
                                            backgroundColor: isDarkMode
                                                ? 'rgba(134, 16, 14, 0.12)'
                                                : 'rgba(134, 16, 14, 0.06)'
                                        },
                                    ]}
                                    onPress={() => handleSelect(service.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: service.color }]}>
                                        <MaterialCommunityIcons name={service.icon} size={22} color="#FFFFFF" />
                                    </View>
                                    <View style={styles.textWrapper}>
                                        <Text style={[
                                            styles.label,
                                            { color: isDarkMode ? COLORS.textLight : COLORS.textPrimary }
                                        ]}>
                                            {service.label}
                                        </Text>
                                        <Text style={[
                                            styles.subtitle,
                                            { color: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted }
                                        ]}>
                                            {service.subtitle}
                                        </Text>
                                    </View>
                                    {isActive && (
                                        <MaterialCommunityIcons
                                            name="check-circle"
                                            size={20}
                                            color={COLORS.brandPrimary}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
    },
    sheetContainer: {
        borderRadius: 36,
        overflow: 'hidden',
        // Premium shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 24,
    },
    handleWrapper: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    optionsContainer: {
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 24,
        marginBottom: 4,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textWrapper: {
        flex: 1,
        marginLeft: 14,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});

export default ServicePickerModal;
