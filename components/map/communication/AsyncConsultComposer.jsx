import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";

export default function AsyncConsultComposer({
  text,
  onChangeText,
  onSend,
  isSending = false,
  disabled = false,
  error = null,
  colors,
}) {
  const canSend = Boolean(text?.trim()) && !isSending && !disabled;
  return (
    <View style={styles.container}>
      {error ? (
        <View style={[styles.errorRow, { backgroundColor: colors.softSurface }]}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.brandPrimary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error.message || "Message not sent. Try again."}
          </Text>
        </View>
      ) : null}
      <View style={[styles.composer, { backgroundColor: colors.inputSurface }]}>
        <TextInput
          value={text}
          onChangeText={onChangeText}
          editable={!disabled && !isSending}
          multiline
          maxLength={1000}
          placeholder={disabled ? "This consult is read-only" : "Message your care team"}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel="Consult message"
        />
        <Text style={[styles.count, { color: colors.muted }]}>{text?.length || 0}/1000</Text>
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send consult message"
          accessibilityState={{ disabled: !canSend, busy: isSending }}
          style={({ pressed }) => [
            styles.sendButton,
            { opacity: canSend ? (pressed ? 0.85 : 1) : 0.45 },
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={19} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 14 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderRadius: 20, padding: 10 },
  input: { flex: 1, minHeight: 42, maxHeight: 112, paddingHorizontal: 4, paddingVertical: 9, fontSize: 15, lineHeight: 20, textAlignVertical: "top" },
  count: { fontSize: 10, lineHeight: 16, marginBottom: 10 },
  sendButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.brandPrimary },
});
