import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';

const VersionFooter = ({ onVersionTap, onHeartTap, colors }) => {
    return (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Pressable
                onPress={onVersionTap}
                style={{ padding: 10, opacity: 0.5 }}
            >
                <Text style={{ 
                    fontSize: 12, 
                    fontWeight: "600", 
                    color: colors.textMuted,
                    letterSpacing: 1
                }}>
                    VERSION 1.0.4
                </Text>
            </Pressable>
            
            <Pressable
                onPress={onHeartTap}
                style={{ padding: 10, opacity: 0.4 }}
            >
                <Text style={{ 
                    fontSize: 10, 
                    fontWeight: "500", 
                    color: colors.textMuted,
                    letterSpacing: 0.5
                }}>
                    © 2026 iVisit.ng All rights reserved.
                </Text>
            </Pressable>
        </View>
    );
};

export default memo(VersionFooter);
