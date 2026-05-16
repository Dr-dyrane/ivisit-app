import { useMemo } from "react";
import { View, TextInput, Pressable, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./emergencyContactDispatch.styles";
import { emergencyChatContent } from "./emergencyContactDispatch.content";

// PULLBACK NOTE: Contact Dispatch CD-6 - Composer component.
// Owns: Text input, send button, and input validation.
// Does NOT own: Message sending logic (handled by parent).

export function EmergencyContactDispatchComposer({
  text,
  onChangeText,
  onSend,
  isSending,
  disabled,
  error,
  colors,
}) {
  const canSend = text?.trim().length > 0 && !isSending && !disabled;
  const placeholder = disabled
    ? emergencyChatContent.composerPlaceholderDisabled
    : emergencyChatContent.composerPlaceholder;

  const sendButtonStyle = useMemo(
    () => ({
      opacity: canSend ? 1 : 0.5,
      backgroundColor: canSend ? colors.accent : `${colors.accent}40`,
    }),
    [canSend, colors.accent]
  );

  return (
    <View style={styles.composerContainer}>
      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.accent} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {emergencyChatContent.composerError}
          </Text>
        </View>
      )}

      <View style={[styles.composerRow, { backgroundColor: colors.bg }]}>
        {/* Text input */}
        <TextInput
          value={text}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.subtext}
          style={[styles.composerInput, { color: colors.text }]}
          multiline
          maxLength={emergencyChatContent.composerCharLimit}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={() => canSend && onSend()}
        />

        {/* Character count */}
        <Text style={[styles.charCount, { color: colors.subtext }]}>
          {text?.length || 0}/{emergencyChatContent.composerCharLimit}
        </Text>

        {/* Send button */}
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendButton,
            sendButtonStyle,
            pressed && canSend && styles.sendButtonPressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default EmergencyContactDispatchComposer;
