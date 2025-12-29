// components/AuthInputModal.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AuthInputModal({ visible, type, onClose }) {
  const { isDarkMode } = useTheme();
  const [inputValue, setInputValue] = useState("");

  // Animation Refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  const colors = {
    sheet: isDarkMode ? "#0D1117" : "#FFFFFF",
    inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    primary: "#86100E",
    border: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 10, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Animate the CTA button appearance when typing starts
  useEffect(() => {
    Animated.spring(buttonScale, {
      toValue: inputValue.length > 3 ? 1 : 0.8,
      useNativeDriver: true,
    }).start();
  }, [inputValue]);

  const handleDismiss = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120) handleDismiss();
        else Animated.spring(panY, { toValue: 0, friction: 8, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View className="flex-1 justify-end">
        
        {/* BACKDROP */}
        <Animated.View style={{ opacity: bgOpacity }} className="absolute inset-0 bg-black/70">
          <Pressable className="flex-1" onPress={handleDismiss} />
        </Animated.View>

        {/* MODAL SHEET */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateY: slideAnim }, { translateY: panY }],
            backgroundColor: colors.sheet,
            borderColor: colors.border,
            borderTopWidth: 1,
            height: SCREEN_HEIGHT * 0.75, // Lower, focused modal
          }}
          className="rounded-t-[32px] shadow-2xl overflow-hidden"
        >
          {/* Header Area */}
          <View className="px-8 pt-4">
            <View className="w-10 h-1 bg-gray-500/20 rounded-full self-center mb-6" />
            
            <View className="flex-row justify-between items-center mb-2">
              <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tighter">
                {type === "phone" ? "Mobile Access" : "Secure Email"}
              </Text>
              <Pressable 
                onPress={handleDismiss} 
                className="w-8 h-8 rounded-full bg-gray-500/10 items-center justify-center"
              >
                <Ionicons name="close" size={18} color={isDarkMode ? "#AAA" : "#666"} />
              </Pressable>
            </View>
            <Text className="text-gray-500 text-sm font-medium mb-8">
              Code will be sent for emergency verification.
            </Text>
          </View>

          {/* INPUT & INLINE CTA AREA */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="px-8"
          >
            {/* Modal Label (Proper UX) */}
            <Text 
                className="text-[10px] font-black tracking-[2px] mb-3 ml-1"
                style={{ color: colors.primary }}
            >
                {type === "phone" ? "PHONE NUMBER" : "EMAIL ADDRESS"}
            </Text>

            <View 
                style={{ backgroundColor: colors.inputBg }}
                className="flex-row items-center rounded-2xl px-4 h-[72px] border border-gray-500/5"
            >
              <Ionicons 
                name={type === "phone" ? "call-outline" : "mail-outline"} 
                size={20} 
                color={colors.primary} 
                className="mr-3" 
              />
              
              <TextInput
                autoFocus
                selectionColor={colors.primary}
                keyboardType={type === "phone" ? "phone-pad" : "email-address"}
                placeholder={type === "phone" ? "000 000 0000" : "name@ivisit.com"}
                placeholderTextColor={isDarkMode ? "#444" : "#BBB"}
                value={inputValue}
                onChangeText={setInputValue}
                className="flex-1 text-xl font-bold ml-2"
                style={{ color: colors.text }}
              />

              {/* INLINE ICON CTA */}
              <Animated.View style={{ transform: [{ scale: buttonScale }], opacity: inputValue.length > 0 ? 1 : 0.4 }}>
                <Pressable
                  onPress={() => {
                    if (inputValue.length > 3) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      console.log("Proceed to OTP");
                    }
                  }}
                  disabled={inputValue.length <= 3}
                  style={{ backgroundColor: colors.primary }}
                  className="w-12 h-12 rounded-xl items-center justify-center"
                >
                  <Ionicons name="arrow-forward" size={24} color="white" />
                </Pressable>
              </Animated.View>
            </View>

            {/* Verification Reassurance */}
            <View className="flex-row items-center mt-6 ml-1">
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text className="text-[11px] text-gray-500 font-bold ml-2 tracking-tight">
                    iVisit Encryption Active
                </Text>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}