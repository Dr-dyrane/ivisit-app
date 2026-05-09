import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from "@expo/vector-icons";
import { getMapRenderTokens } from "../tokens/mapRenderTokens";
import { triggerPress } from "../../../services/hapticService";

const squircle = (radius) => ({
    borderRadius: radius,
    borderCurve: "continuous",
});

// PULLBACK NOTE: Create LocationChrome in chrome folder following MapControls pattern
// OLD: Custom LocationChrome in exploreIntent folder
// NEW: Floating chrome component in chrome folder, positioned near MapControls
// UPDATED: Progressive pickup chip. Compact by default, expands before opening sheet.

const COMPACT_WIDTH = 46;
const EXPANDED_WIDTH = 176;
const CHIP_HEIGHT = 46;

/**
 * LocationChrome - Floating chrome for location change affordance
 * 
 * Shows location icon, tap to open location sheet
 * Positioned as a small map chrome affordance for opening the location sheet
 * Compact by default, then expands into a pickup summary before opening LocationSheet
 * 
 * @param {Function} onPress - Callback when chrome is tapped
 * @param {boolean} isDarkMode - Dark mode flag
 * @param {number} topOffset - Top offset for positioning
 * @param {number} bottomOffset - Bottom offset for positioning (alternative to top)
 * @param {number} leftOffset - Left offset for positioning (default: 14)
 * @param {number} rightOffset - Right offset for positioning (alternative to left)
 * @param {string} pickupTitle - Expanded chip title
 * @param {string} pickupSubtitle - Expanded chip subtitle
 */
const LocationChrome = ({
    onPress,
    isDarkMode,
    topOffset,
    bottomOffset,
    leftOffset = 14,
    rightOffset = null,
    pickupTitle = "Pickup",
    pickupSubtitle = "Hemet, CA",
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const progress = useRef(new Animated.Value(0)).current;
    const collapseTimerRef = useRef(null);
    const hintTimerRef = useRef(null);
    const hintCollapseTimerRef = useRef(null);
    const verticalStyle =
        typeof bottomOffset === "number"
            ? { bottom: bottomOffset }
            : { top: topOffset };
    const horizontalStyle =
        typeof rightOffset === "number"
            ? { right: rightOffset }
            : { left: leftOffset };
    const positionStyle = { ...verticalStyle, ...horizontalStyle };
    const renderTokens = getMapRenderTokens({ isDarkMode });
    const iconColor = isDarkMode
        ? "rgba(248, 250, 252, 0.82)"
        : "rgba(15, 23, 42, 0.72)";
    const textColor = isDarkMode ? "#F8FAFC" : "#0F172A";
    const mutedTextColor = isDarkMode
        ? "rgba(226, 232, 240, 0.72)"
        : "rgba(71, 85, 105, 0.76)";

    const clearCollapseTimer = useCallback(() => {
        if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current);
            collapseTimerRef.current = null;
        }
    }, []);

    const animateTo = useCallback(
        (nextValue) => {
            Animated.spring(progress, {
                toValue: nextValue,
                useNativeDriver: false,
                tension: 210,
                friction: 24,
            }).start();
        },
        [progress],
    );

    const collapse = useCallback(() => {
        clearCollapseTimer();
        setIsExpanded(false);
        animateTo(0);
    }, [animateTo, clearCollapseTimer]);

    const expand = useCallback(
        ({ autoCollapse = true } = {}) => {
            clearCollapseTimer();
            setIsExpanded(true);
            animateTo(1);
            if (autoCollapse) {
                collapseTimerRef.current = setTimeout(collapse, 4200);
            }
        },
        [animateTo, clearCollapseTimer, collapse],
    );

    useEffect(() => {
        hintTimerRef.current = setTimeout(() => {
            expand({ autoCollapse: false });
            hintCollapseTimerRef.current = setTimeout(collapse, 2200);
        }, 1400);

        return () => {
            clearCollapseTimer();
            if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
            if (hintCollapseTimerRef.current) clearTimeout(hintCollapseTimerRef.current);
        };
    }, [clearCollapseTimer, collapse, expand]);

    const handleIconPress = useCallback(() => {
        if (isExpanded) {
            collapse();
            return;
        }
        expand();
    }, [collapse, expand, isExpanded]);

    const handleOpenPress = useCallback(() => {
        if (!isExpanded) {
            expand();
            return;
        }
        clearCollapseTimer();
        onPress?.();
    }, [clearCollapseTimer, expand, isExpanded, onPress]);

    const chipWidth = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [COMPACT_WIDTH, EXPANDED_WIDTH],
    });
    const contentOpacity = progress.interpolate({
        inputRange: [0, 0.45, 1],
        outputRange: [0, 0, 1],
    });
    const iconRotation = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "90deg"],
    });

    return (
        <View style={[styles.chromeContainer, positionStyle]}>
            <Animated.View style={[
                styles.chromePill,
                {
                    shadowColor: renderTokens.controlShadow,
                    borderColor: renderTokens.controlBorder,
                    width: chipWidth,
                }
            ]}>
                {Platform.OS === "ios" ? (
                    <BlurView
                        intensity={isDarkMode ? 40 : 60}
                        tint={isDarkMode ? "dark" : "light"}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            styles.androidSurface,
                            {
                                backgroundColor: renderTokens.controlSurface,
                            }
                        ]}
                    />
                )}

                <View style={styles.chromeButton}>
                    <Pressable
                        onPress={handleIconPress}
                        onPressIn={() => triggerPress("light")}
                        style={({ pressed }) => [
                            styles.iconButton,
                            { transform: [{ scale: pressed ? 0.95 : 1 }] }
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel={
                            isExpanded ? "Collapse pickup point" : "Show pickup point"
                        }
                    >
                        <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
                            <Ionicons
                                name="compass-outline"
                                size={24}
                                color={iconColor}
                            />
                        </Animated.View>
                    </Pressable>
                    <Pressable
                        onPress={handleOpenPress}
                        onPressIn={() => triggerPress("light")}
                        style={styles.copyButton}
                        disabled={!isExpanded}
                        accessibilityRole="button"
                        accessibilityLabel="Open pickup location sheet"
                    >
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.copyStack, { opacity: contentOpacity }]}
                        >
                            <Text
                                numberOfLines={1}
                                style={[styles.pickupTitle, { color: mutedTextColor }]}
                            >
                                {pickupTitle}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[styles.pickupSubtitle, { color: textColor }]}
                            >
                                {pickupSubtitle}
                            </Text>
                        </Animated.View>
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.chevronSlot, { opacity: contentOpacity }]}
                        >
                            <Ionicons name="chevron-forward" size={18} color={textColor} />
                        </Animated.View>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    chromeContainer: {
        position: "absolute",
        zIndex: 10,
    },
    chromePill: {
        width: COMPACT_WIDTH,
        height: CHIP_HEIGHT,
        paddingVertical: 3,
        paddingHorizontal: 3,
        borderRadius: 23,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 3,
    },
    androidSurface: {
        borderRadius: 23,
    },
    chromeButton: {
        width: "100%",
        height: 40,
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        ...squircle(16),
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...squircle(16),
    },
    copyButton: {
        flex: 1,
        minWidth: 0,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 2,
        paddingRight: 8,
    },
    copyStack: {
        flex: 1,
        minWidth: 0,
        justifyContent: "center",
    },
    pickupTitle: {
        fontSize: 11,
        lineHeight: 13,
        fontWeight: "700",
    },
    pickupSubtitle: {
        fontSize: 14,
        lineHeight: 17,
        fontWeight: "800",
    },
    chevronSlot: {
        width: 18,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default memo(LocationChrome);
