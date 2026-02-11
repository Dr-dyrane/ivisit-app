import React, { memo } from 'react';
import { View, Text, Modal, Pressable, Animated, Platform, TouchableOpacity } from 'react-native';

const LoveNoteModal = ({ visible, onClose, slideAnim }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable 
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                onPress={onClose}
            >
                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        transform: [{ translateY: slideAnim }],
                        backgroundColor: '#FFF0F5', // Lavender Blush
                        borderTopLeftRadius: 48,
                        borderTopRightRadius: 48,
                        padding: 32,
                        paddingBottom: Platform.OS === 'ios' ? 50 : 32,
                        alignItems: 'center',
                        shadowColor: "#D81B60",
                        shadowOffset: { width: 0, height: -10 },
                        shadowOpacity: 0.15,
                        shadowRadius: 20,
                        elevation: 24,
                    }}
                >
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>🌹❤️</Text>
                    
                    <View style={{ 
                        backgroundColor: 'rgba(216, 27, 96, 0.1)', 
                        paddingHorizontal: 12, 
                        paddingVertical: 6, 
                        borderRadius: 12,
                        marginBottom: 12
                    }}>
                        <Text style={{ 
                            fontSize: 10, 
                            fontWeight: "800", 
                            color: "#D81B60", 
                            letterSpacing: 1.5,
                            textTransform: "uppercase"
                        }}>
                            APPRECIATION
                        </Text>
                    </View>

                    <Text
                        style={{
                            fontSize: 28,
                            fontWeight: "900",
                            color: "#880E4F",
                            textAlign: "center",
                            marginBottom: 16,
                            letterSpacing: -1.0,
                            lineHeight: 32
                        }}
                    >
                        To My Day 1 Supporter
                    </Text>
                    
                    <Text
                        style={{
                            fontSize: 17,
                            color: "#880E4F",
                            textAlign: "center",
                            lineHeight: 26,
                            fontWeight: "500",
                            marginBottom: 32,
                            opacity: 0.8
                        }}
                    >
                        "To my beautiful wife, thank you for believing in me from the very start. You are my rock, my inspiration, and my greatest blessing. I love you endlessly!"
                    </Text>
                    
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            backgroundColor: "#D81B60",
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 24,
                            shadowColor: "#D81B60",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                    >
                        <Text style={{ 
                            color: "#FFFFFF", 
                            fontWeight: "bold", 
                            fontSize: 16,
                            letterSpacing: 0.5
                        }}>
                            Close with Love
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

export default memo(LoveNoteModal);
