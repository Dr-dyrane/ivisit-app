import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import InputModal from "../../ui/InputModal";
import Input from "../../form/Input";
import PhoneInputField from "../../register/PhoneInputField";
import {
  getStackViewportSurfaceConfig,
  getStackViewportVariant,
} from "../../../utils/ui/stackViewportConfig";

// PULLBACK NOTE: EmergencyContacts editor modal.
// Owns: the create/edit/resolve wizard UI only.
// Does NOT own: save semantics or field rules; those are injected from the screen model.

const getModalTitle = (editorMode, wizardStep) => {
  if (editorMode === "edit")
    return wizardStep === 2 ? "Confirm changes" : "Update contact";
  if (editorMode === "resolve")
    return wizardStep === 2 ? "Review contact" : "Fix legacy contact";
  return wizardStep === 2 ? "Review contact" : "Add emergency contact";
};

export default function EmergencyContactsEditorModal({
  visible,
  editorMode,
  editingId,
  wizardStep,
  draft,
  isSaving,
  isCurrentStepValid,
  canSave,
  onClose,
  onSave,
  onNext,
  onBack,
  onChangeField,
  onPhoneChange,
  getInputValidation,
  theme,
}) {
  const { width } = useWindowDimensions();
  const title = getModalTitle(editorMode, wizardStep);
  const isFinalStep = wizardStep === 2;
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const surfaceConfig = useMemo(
    () => getStackViewportSurfaceConfig(viewportVariant),
    [viewportVariant],
  );

  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={title}
      modalPresentationMode="centered-modal"
      modalMaxWidth={surfaceConfig.modalMaxWidth ?? 520}
      modalMaxHeightRatio={surfaceConfig.modalMaxHeightRatio ?? 0.82}
      primaryAction={isFinalStep ? onSave : onNext}
      primaryActionLabel={
        isFinalStep
          ? editorMode === "edit"
            ? "Save Changes"
            : "Save Contact"
          : "Next"
      }
      secondaryAction={wizardStep > 0 ? onBack : onClose}
      secondaryActionLabel={wizardStep > 0 ? "Back" : "Cancel"}
      loading={isSaving}
      disabled={isFinalStep ? !canSave : !isCurrentStepValid}
    >
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((wizardStep + 1) / 3) * 100}%` },
          ]}
        />
      </View>

      {wizardStep === 0 ? (
        <View style={styles.stepBody}>
          <Input
            label="Full Name"
            placeholder="e.g. Jane Doe"
            value={draft?.name}
            onChangeText={(value) => onChangeField("name", value)}
            icon="person"
            autoFocus
          />
          {draft?.name ? (
            <Text
              style={[
                styles.validation,
                {
                  color: getInputValidation("name", draft.name).valid
                    ? COLORS.success
                    : COLORS.error,
                },
              ]}
            >
              {getInputValidation("name", draft.name).message}
            </Text>
          ) : null}

          <Input
            label="Relationship"
            placeholder="e.g. Sister, Doctor"
            value={draft?.relationship}
            onChangeText={(value) => onChangeField("relationship", value)}
            icon="heart"
          />
        </View>
      ) : null}

      {wizardStep === 1 ? (
        <View style={styles.stepBody}>
          <PhoneInputField
            key={`phone-${editorMode}-${editingId || "new"}`}
            initialValue={draft?.phone || null}
            onValidChange={onPhoneChange}
            onSubmit={onNext}
          />
        </View>
      ) : null}

      {wizardStep === 2 ? (
        <View style={styles.reviewCard}>
          <View style={styles.reviewIcon}>
            <Ionicons name="people" size={36} color={COLORS.brandPrimary} />
          </View>
          <Text style={[styles.reviewName, { color: theme.text }]}>
            {draft?.name}
          </Text>
          <Text
            style={[styles.reviewRelationship, { color: COLORS.brandPrimary }]}
          >
            {draft?.relationship || "Emergency contact"}
          </Text>

          <View
            style={[styles.reviewDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.reviewRow}>
            <Ionicons name="call" size={16} color={theme.muted} />
            <Text style={[styles.reviewValue, { color: theme.text }]}>
              {draft?.phone}
            </Text>
          </View>
        </View>
      ) : null}
    </InputModal>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(134,16,14,0.12)",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 999,
  },
  stepBody: {
    gap: 14,
  },
  validation: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: -6,
    marginLeft: 12,
  },
  reviewCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  reviewIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(134,16,14,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center",
  },
  reviewRelationship: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  reviewDivider: {
    width: "100%",
    height: 1,
    marginVertical: 6,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
