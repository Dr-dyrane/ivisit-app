import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InputModal from "../ui/InputModal";
import Input from "../form/Input";
import useSwipeGesture from "../../utils/useSwipeGesture";
import { COLORS } from "../../constants/colors";
import { INSURANCE_SCREEN_COPY } from "./insuranceScreen.content";

// PULLBACK NOTE: InsuranceEditorModal keeps the wizard centered and bounded on wide screens.
// The page stays readable while scan/upload work happens inside a dedicated side-effect surface.

export default function InsuranceEditorModal({
  visible,
  onClose,
  draft,
  step,
  isEditing,
  isSubmitting,
  isScanning,
  isDarkMode,
  canAdvance,
  getInputValidation,
  onNextStep,
  onPreviousStep,
  onSubmit,
  onChangeDraftField,
  onScanInsuranceCard,
  onPickImage,
}) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    cardMuted: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9",
  };

  const title = isEditing
    ? INSURANCE_SCREEN_COPY.editor.editTitle
    : INSURANCE_SCREEN_COPY.editor.steps[step] ||
      INSURANCE_SCREEN_COPY.editor.createTitle;

  const advanceWithValidation = () => {
    if (canAdvance) {
      onNextStep?.();
      return;
    }

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const swipeHandlers = useSwipeGesture(
    () => {
      advanceWithValidation();
    },
    () => {
      if (step > 0) onPreviousStep?.();
    },
  );

  return (
    <InputModal
      visible={visible}
      onClose={onClose}
      title={title}
      primaryAction={step === 2 ? onSubmit : advanceWithValidation}
      primaryActionLabel={
        step === 2
          ? isEditing
            ? INSURANCE_SCREEN_COPY.editor.saveEdit
            : INSURANCE_SCREEN_COPY.editor.saveCreate
          : INSURANCE_SCREEN_COPY.editor.next
      }
      secondaryAction={step > 0 ? onPreviousStep : onClose}
      secondaryActionLabel={
        step > 0
          ? INSURANCE_SCREEN_COPY.editor.back
          : INSURANCE_SCREEN_COPY.editor.cancel
      }
      disabled={!canAdvance && step < 2}
      loading={isSubmitting}
      allowDismissWhileLoading={false}
      modalMaxWidth={640}
    >
      <View
        style={{
          height: 4,
          borderRadius: 999,
          backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,23,42,0.08)",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <View
          style={{
            width: `${((step + 1) / 3) * 100}%`,
            height: "100%",
            backgroundColor: COLORS.brandPrimary,
            borderRadius: 999,
          }}
        />
      </View>

      <Animated.View
        style={{ minHeight: 200, transform: [{ translateX: shakeAnim }] }}
        {...swipeHandlers}
      >
        {step === 0 ? (
          <View style={{ gap: 24 }}>
            <View>
              <Input
                label={INSURANCE_SCREEN_COPY.editor.providerLabel}
                placeholder={INSURANCE_SCREEN_COPY.editor.providerPlaceholder}
                value={draft?.provider_name || ""}
                onChangeText={(value) =>
                  onChangeDraftField?.("provider_name", value)
                }
                icon="business"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={advanceWithValidation}
              />
              {(draft?.provider_name || "").trim().length > 0 ? (
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "400",
                    color: getInputValidation(
                      "provider_name",
                      draft?.provider_name,
                    ).valid
                      ? COLORS.success
                      : COLORS.error,
                    marginTop: 4,
                    marginLeft: 16,
                  }}
                >
                  {
                    getInputValidation("provider_name", draft?.provider_name)
                      .message
                  }
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={onScanInsuranceCard}
              disabled={isScanning}
              style={{
                backgroundColor: colors.cardMuted,
                borderRadius: 18,
                borderCurve: "continuous",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: `${COLORS.brandPrimary}30`,
                opacity: isScanning ? 0.7 : 1,
              }}
            >
              {isScanning ? (
                <ActivityIndicator color={COLORS.brandPrimary} size="small" />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={COLORS.brandPrimary}
                />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 18,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {isScanning
                    ? INSURANCE_SCREEN_COPY.editor.scanPending
                    : INSURANCE_SCREEN_COPY.editor.scanTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "400",
                    color: colors.textMuted,
                  }}
                >
                  {INSURANCE_SCREEN_COPY.editor.scanBody}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 16 }}>
            <View>
              <Input
                label={INSURANCE_SCREEN_COPY.editor.policyLabel}
                placeholder={INSURANCE_SCREEN_COPY.editor.policyPlaceholder}
                value={draft?.policy_number || ""}
                onChangeText={(value) =>
                  onChangeDraftField?.("policy_number", value.toUpperCase())
                }
                icon="card"
                autoFocus
                autoCapitalize="characters"
                onSubmitEditing={advanceWithValidation}
              />
              {(draft?.policy_number || "").trim().length > 0 ? (
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "400",
                    color: getInputValidation(
                      "policy_number",
                      draft?.policy_number,
                    ).valid
                      ? COLORS.success
                      : COLORS.error,
                    marginTop: 4,
                    marginLeft: 16,
                  }}
                >
                  {
                    getInputValidation("policy_number", draft?.policy_number)
                      .message
                  }
                </Text>
              ) : null}
            </View>

            <View>
              <Input
                label={INSURANCE_SCREEN_COPY.editor.groupLabel}
                placeholder={INSURANCE_SCREEN_COPY.editor.groupPlaceholder}
                value={draft?.group_number || ""}
                onChangeText={(value) =>
                  onChangeDraftField?.("group_number", value.toUpperCase())
                }
                icon="people"
                autoCapitalize="characters"
              />
              {(draft?.group_number || "").trim().length > 0 ? (
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "400",
                    color: getInputValidation(
                      "group_number",
                      draft?.group_number,
                    ).valid
                      ? COLORS.success
                      : COLORS.error,
                    marginTop: 4,
                    marginLeft: 16,
                  }}
                >
                  {
                    getInputValidation("group_number", draft?.group_number)
                      .message
                  }
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 24 }}>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "400",
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              {INSURANCE_SCREEN_COPY.editor.imagesBody}
            </Text>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <ImageTile
                label={INSURANCE_SCREEN_COPY.editor.frontLabel}
                iconName="camera-outline"
                uri={draft?.front_image_url}
                onPress={() => onPickImage?.("front_image_url")}
                isDarkMode={isDarkMode}
                textColor={colors.textMuted}
              />
              <ImageTile
                label={INSURANCE_SCREEN_COPY.editor.backLabel}
                iconName="images-outline"
                uri={draft?.back_image_url}
                onPress={() => onPickImage?.("back_image_url")}
                isDarkMode={isDarkMode}
                textColor={colors.textMuted}
              />
            </View>

            <Input
              label={INSURANCE_SCREEN_COPY.editor.holderLabel}
              placeholder={INSURANCE_SCREEN_COPY.editor.holderPlaceholder}
              value={draft?.policy_holder_name || ""}
              onChangeText={(value) =>
                onChangeDraftField?.("policy_holder_name", value)
              }
              icon="person"
            />
          </View>
        ) : null}
      </Animated.View>
    </InputModal>
  );
}

function ImageTile({ label, iconName, uri, onPress, isDarkMode, textColor }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        aspectRatio: 1,
        backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#F1F5F9",
        borderRadius: 20,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: uri ? COLORS.brandPrimary : "transparent",
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
        />
      ) : (
        <View style={{ alignItems: "center", gap: 8 }}>
          <Ionicons name={iconName} size={32} color={textColor} />
          <Text
            style={{
              fontSize: 12,
              lineHeight: 16,
              fontWeight: "600",
              color: textColor,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
