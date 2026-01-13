import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";

export default function InputModal({
  visible,
  onClose,
  title,
  children,
  primaryAction,
  primaryActionLabel = "Submit",
  secondaryAction,
  secondaryActionLabel = "Cancel",
  loading = false,
  disabled = false,
}) {
  const { isDarkMode } = useTheme();
  
  const {
    modalHeight,
    getKeyboardAvoidingViewProps,
    getScrollViewProps
  } = useAndroidKeyboardAwareModal();

  // Reset/Cleanup when closed
  useEffect(() => {
    if (!visible) {
      Keyboard.dismiss();
    }
  }, [visible]);

  const colors = {
    bg: isDarkMode ? "#0B0F1A" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    overlay: isDarkMode ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)", // Manifesto: Glass blur overlay
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          {Platform.OS === 'ios' && (
            <BlurView 
              intensity={20} 
              tint={isDarkMode ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          )}
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
              <View style={styles.centeredContainer}>
                <View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: colors.bg,
                      maxHeight: modalHeight,
                    },
                  ]}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {title}
                    </Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 12,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Ionicons name="close" size={18} color={colors.text} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Body */}
                  <ScrollView {...getScrollViewProps()}>
                    <View style={styles.body}>
                      {children}
                    </View>
                  </ScrollView>

                  {/* Footer */}
                  <View style={styles.footer}>
                    {secondaryAction && (
                      <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          secondaryAction();
                        }}
                        disabled={loading || disabled}
                      >
                        <Text style={[styles.buttonText, { color: colors.textMuted }]}>
                          {secondaryActionLabel}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.primaryButton,
                        { 
                          opacity: disabled || loading ? 0.7 : 1,
                          backgroundColor: COLORS.brandPrimary,
                          shadowColor: COLORS.brandPrimary,
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                          elevation: 8,
                        }
                      ]}
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        primaryAction();
                      }}
                      disabled={loading || disabled}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                          {primaryActionLabel}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 36, // Manifesto: Primary Artifact (Extreme Squircle)
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
    overflow: "hidden",
    borderWidth: 0, // Manifesto: Border-Free
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    borderBottomWidth: 0, // Manifesto: Border-Free
  },
  title: {
    fontSize: 12,
    fontWeight: "900", // Manifesto: Action Text
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.7
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 24,
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 0, // Manifesto: Border-Free
    gap: 16,
  },
  button: {
    flex: 1,
    height: 56, // Manifesto: Larger touch target
    borderRadius: 20, // Manifesto: Card-in-Card
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
  },
  primaryButton: {
    // Style handled inline for dynamic props
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800", // Manifesto: Action Text
    letterSpacing: 0.5,
  },
});
