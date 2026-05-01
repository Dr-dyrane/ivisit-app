import React from "react";
import { Text, TextInput, View } from "react-native";
import InputModal from "../ui/InputModal";
import { HELP_SUPPORT_SCREEN_COPY } from "./helpSupport.content";

function ComposerField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  isDarkMode,
}) {
  const text = isDarkMode ? "#FFFFFF" : "#0F172A";
  const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
  const surface = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const inputSurface = isDarkMode ? "#0F172A" : "#FFFFFF";

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: textMuted,
          fontSize: 12,
          lineHeight: 16,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderRadius: 20,
          padding: 10,
          backgroundColor: surface,
        }}
      >
        <View
          style={{
            borderRadius: 14,
            backgroundColor: inputSurface,
            paddingHorizontal: 12,
            paddingVertical: multiline ? 12 : 10,
          }}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={textMuted}
            multiline={multiline}
            autoCorrect={false}
            style={{
              color: text,
              fontSize: 15,
              lineHeight: multiline ? 22 : 20,
              fontWeight: "500",
              minHeight: multiline ? 110 : 20,
              textAlignVertical: multiline ? "top" : "center",
            }}
            selectionColor="#86100E"
          />
        </View>
      </View>
    </View>
  );
}

export default function HelpSupportComposerModal({
  visible,
  subject,
  message,
  canSubmit,
  isSubmitting,
  onClose,
  onDiscard,
  onSubmit,
  onSubjectChange,
  onMessageChange,
  isDarkMode,
}) {
  const copy = HELP_SUPPORT_SCREEN_COPY.rows;

  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={copy.composerTitle}
      primaryAction={() => {
        void onSubmit();
      }}
      primaryActionLabel={
        isSubmitting ? copy.composerSubmitting : copy.composerSubmit
      }
      secondaryAction={onDiscard}
      secondaryActionLabel={copy.composerDiscard}
      loading={isSubmitting}
      disabled={!canSubmit}
      modalPresentationMode={null}
    >
      <View style={{ gap: 18 }}>
        <ComposerField
          label={copy.composerSubject}
          value={subject}
          onChangeText={onSubjectChange}
          placeholder={copy.composerSubjectPlaceholder}
          isDarkMode={isDarkMode}
        />
        <ComposerField
          label={copy.composerMessage}
          value={message}
          onChangeText={onMessageChange}
          placeholder={copy.composerMessagePlaceholder}
          isDarkMode={isDarkMode}
          multiline
        />
      </View>
    </InputModal>
  );
}
