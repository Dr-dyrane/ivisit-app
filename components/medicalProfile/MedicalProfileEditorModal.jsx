import React from "react";
import { View } from "react-native";
import InputModal from "../ui/InputModal";
import ProfileField from "../form/ProfileField";
import { MEDICAL_PROFILE_SCREEN_COPY } from "./medicalProfileScreen.content";

// PULLBACK NOTE: MedicalProfileEditorModal replaces the always-open inline form.
// The screen stays readable, and editing becomes a responsive side-effect surface governed by InputModal.

export default function MedicalProfileEditorModal({
  visible,
  onClose,
  draft,
  onChangeField,
  onSave,
  isSaving,
}) {
  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={MEDICAL_PROFILE_SCREEN_COPY.editor.title}
      primaryAction={onSave}
      primaryActionLabel={MEDICAL_PROFILE_SCREEN_COPY.editor.save}
      secondaryAction={onClose}
      secondaryActionLabel={MEDICAL_PROFILE_SCREEN_COPY.editor.cancel}
      loading={isSaving}
      allowDismissWhileLoading={false}
      modalMaxWidth={560}
    >
      <View style={{ gap: 16 }}>
        <ProfileField
          label="Blood type"
          value={draft?.bloodType ?? ""}
          onChange={(value) => onChangeField("bloodType", value)}
          iconName="water-outline"
          placeholder="A+, O-, or unknown"
          autoCapitalize="characters"
        />
        <ProfileField
          label="Allergies"
          value={draft?.allergies ?? ""}
          onChange={(value) => onChangeField("allergies", value)}
          iconName="warning-outline"
          placeholder="Food, medication, or environmental allergies"
          autoCapitalize="sentences"
        />
        <ProfileField
          label="Current medications"
          value={draft?.medications ?? ""}
          onChange={(value) => onChangeField("medications", value)}
          iconName="medical-outline"
          placeholder="Current medications and dosage notes"
          autoCapitalize="sentences"
        />
        <ProfileField
          label="Chronic conditions"
          value={draft?.conditions ?? ""}
          onChange={(value) => onChangeField("conditions", value)}
          iconName="fitness-outline"
          placeholder="Conditions responders should know"
          autoCapitalize="sentences"
        />
        <ProfileField
          label="Past surgeries"
          value={draft?.surgeries ?? ""}
          onChange={(value) => onChangeField("surgeries", value)}
          iconName="bandage-outline"
          placeholder="Relevant procedures or operations"
          autoCapitalize="sentences"
        />
        <ProfileField
          label="Emergency notes"
          value={draft?.notes ?? ""}
          onChange={(value) => onChangeField("notes", value)}
          iconName="document-text-outline"
          placeholder="Anything care teams should know quickly"
          autoCapitalize="sentences"
          multiline
        />
      </View>
    </InputModal>
  );
}
