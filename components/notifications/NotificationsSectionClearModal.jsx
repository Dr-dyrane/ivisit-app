import React from "react";
import { Text, View } from "react-native";
import InputModal from "../ui/InputModal";

export default function NotificationsSectionClearModal({
  visible,
  sectionLabel,
  count = 0,
  onClose,
  onConfirm,
  loading = false,
  theme,
}) {
  const title = sectionLabel ? `Clear ${sectionLabel}` : "Clear section";
  const body =
    count === 1
      ? "Remove 1 notification from your inbox."
      : `Remove ${count} notifications from your inbox.`;

  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={title}
      primaryAction={onConfirm}
      primaryActionLabel="Clear"
      secondaryAction={onClose}
      secondaryActionLabel="Cancel"
      loading={loading}
      modalPresentationMode="centered-modal"
      modalMaxWidth={420}
      allowDismissWhileLoading={false}
    >
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "400",
            color: theme.text,
          }}
        >
          {body}
        </Text>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 19,
            fontWeight: "400",
            color: theme.textMuted,
          }}
        >
          Related visits, requests, and activity are not affected.
        </Text>
      </View>
    </InputModal>
  );
}
