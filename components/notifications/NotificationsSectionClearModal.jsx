import React from "react";
import { Text, View } from "react-native";
import InputModal from "../ui/InputModal";
import { COLORS } from "../../constants/colors";

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
      ? "Delete 1 notification from this group."
      : `Delete ${count} notifications from this group.`;

  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={title}
      primaryAction={onConfirm}
      primaryActionLabel="Delete"
      primaryActionBackgroundColor={COLORS.error}
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
      </View>
    </InputModal>
  );
}
