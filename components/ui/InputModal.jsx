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
    keyboardHeight,
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
        <View
          style={[styles.overlay, {
            backgroundColor: colors.overlay,
            paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0
          }]}
        >
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
                      <View style={[
                        styles.closeIcon,
                        {
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        }
                      ]}>
                        <Ionicons name="close" size={20} color={colors.text} />
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
    padding: 12,
  },
  modalContent: {
    borderRadius: 32, // PULLBACK NOTE: Increased from 24 to 32 for more roundness
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
    overflow: "hidden",
    borderWidth: 0,
    borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12, // PULLBACK NOTE: Reduced from 16 to 12
    paddingTop: 12, // PULLBACK NOTE: Reduced from 16 to 12
    paddingBottom: 2, // PULLBACK NOTE: Reduced from 4 to 2
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 16, // PULLBACK NOTE: Increased from 12 for larger heading
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: 'capitalize',
    opacity: 0.7
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    width: 36, // PULLBACK NOTE: Increased from 28 for larger close button
    height: 36, // PULLBACK NOTE: Increased from 28 for larger close button
    borderRadius: 18, // PULLBACK NOTE: Circle shape (half of width/height)
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
  },
  body: {
    padding: 12, // PULLBACK NOTE: Reduced from 16 to 12
  },
  footer: {
    flexDirection: "row",
    padding: 12, // PULLBACK NOTE: Reduced from 16 to 12
    borderTopWidth: 0,
    gap: 8, // PULLBACK NOTE: Reduced from 12 to 8
  },
  button: {
    flex: 1,
    height: 44, // PULLBACK NOTE: Reduced from 48 to 44
    borderRadius: 14, // PULLBACK NOTE: Reduced from 16 to 14 for more squircle
    alignItems: "center",
    justifyContent: "center",
    borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
  },
  secondaryButton: {
    backgroundColor: "transparent",
  },
  primaryButton: {
    // Style handled inline for dynamic props
  },
  buttonText: {
    fontSize: 14, // PULLBACK NOTE: Reduced from 15 to 14
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
