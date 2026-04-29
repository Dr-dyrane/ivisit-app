import React from "react";
import { Text, View } from "react-native";
import InputModal from "../ui/InputModal";
import { COLORS } from "../../constants/colors";
import { PROFILE_SCREEN_COPY } from "./profileScreen.content";

// PULLBACK NOTE: Delete account now uses the shared stack modal contract.
// It stays centered and bounded at every width so destructive confirmation does not stretch with the page shell.

export default function ProfileDeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  isDeleting,
  theme,
}) {
  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={PROFILE_SCREEN_COPY.deleteModal.title}
      primaryAction={onConfirm}
      primaryActionLabel={PROFILE_SCREEN_COPY.deleteModal.confirm}
      primaryActionBackgroundColor={COLORS.error}
      secondaryAction={onClose}
      secondaryActionLabel={PROFILE_SCREEN_COPY.deleteModal.cancel}
      loading={isDeleting}
      modalPresentationMode="centered-modal"
      modalMaxWidth={460}
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
          {PROFILE_SCREEN_COPY.deleteModal.body}
        </Text>
      </View>
    </InputModal>
  );
}
