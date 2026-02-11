// components/settings/SettingsSection.jsx

import React, { memo } from "react";
import { View, Text, Animated } from "react-native";

const SettingsSection = memo(({
    title,
    children,
    fadeAnim,
    slideAnim,
    colors,
}) => {
    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingHorizontal: 12,
                marginBottom: 24,
            }}
        >
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: colors.textMuted,
                    marginBottom: 16,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                }}
            >
                {title}
            </Text>
            {children}
        </Animated.View>
    );
});

export default SettingsSection;
