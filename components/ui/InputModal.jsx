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
    bg: isDarkMode ? "#1E293B" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    overlay: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
    border: isDarkMode ? "#334155" : "#E2E8F0",
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
                  <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {title}
                    </Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Body */}
                  <ScrollView {...getScrollViewProps()}>
                    <View style={styles.body}>
                      {children}
                    </View>
                  </ScrollView>

                  {/* Footer */}
                  <View style={[styles.footer, { borderTopColor: colors.border }]}>
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
                        { opacity: disabled || loading ? 0.7 : 1 }
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
    borderRadius: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
  },
  primaryButton: {
    backgroundColor: COLORS.brandPrimary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
