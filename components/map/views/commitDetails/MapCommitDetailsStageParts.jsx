import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CountryPickerModal from "../../../register/CountryPickerModal";
import MapAuthQuestionCard from "../../shared/MapAuthQuestionCard";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import styles from "./mapCommitDetails.styles";

function MapCommitPhoneCountryChip({
  country,
  countryLoading,
  titleColor,
  mutedColor,
  onPress,
}) {
  return (
    <Pressable
      disabled={countryLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.phoneCountryChip,
        pressed && !countryLoading ? styles.phoneCountryChipPressed : null,
        countryLoading ? styles.phoneCountryChipDisabled : null,
      ]}
    >
      <Text style={styles.phoneCountryFlag}>
        {country?.flag || "\u{1F310}"}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.phoneCountryDial, { color: titleColor }]}
      >
        {countryLoading ? "..." : country?.dial_code || "+1"}
      </Text>
      <Ionicons name="chevron-down" size={14} color={mutedColor} />
    </Pressable>
  );
}

export function MapCommitDetailsTopSlot({
  title,
  subtitle,
  onBack,
  onClose,
  titleColor,
  mutedColor,
  closeSurface,
}) {
  return (
    <View style={styles.topSlot}>
      {typeof onBack === "function" ? (
        <MapHeaderIconButton
          onPress={onBack}
          accessibilityLabel="Go back"
          backgroundColor={closeSurface}
          color={titleColor}
          iconName="chevron-back"
          pressableStyle={styles.topSlotAction}
          style={styles.topSlotCloseButton}
        />
      ) : (
        <View style={styles.topSlotSpacer} />
      )}
      <View style={styles.topSlotCopy}>
        <Text
          numberOfLines={1}
          style={[styles.topSlotTitle, { color: titleColor }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.topSlotSubtitle, { color: mutedColor }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <MapHeaderIconButton
        onPress={onClose}
        accessibilityLabel="Close commit details"
        backgroundColor={closeSurface}
        color={titleColor}
        pressableStyle={styles.topSlotAction}
        style={styles.topSlotCloseButton}
      />
    </View>
  );
}

export function MapCommitDetailsQuestionCard({
  stageMetrics,
  inputSurfaceColor,
  avatarSurfaceColor,
  titleColor,
  mutedColor,
  accentColor,
  statusTextColor,
  successColor,
  errorColor,
  resendSurfaceColor,
  disabledTextColor,
  step,
  value,
  selectionColor,
  errorMessage,
  successMessage,
  otpRemainingSeconds,
  isSubmitting,
  onChangeValue,
  onSubmit,
  onResend,
  phoneField,
}) {
  // ── Sizing from stageMetrics (viewport-relative, same formulas as before) ──
  const viewportHeight = stageMetrics?.height || 852;
  const orbSize = Math.round(
    Math.min(88, Math.max(72, viewportHeight * 0.108)),
  );
  const titleFontSize = stageMetrics?.topSlot?.titleStyle?.fontSize || 28;
  const titleLineHeight = Math.round(titleFontSize * 1.14);
  const cardPaddingTop = Math.round(
    Math.min(22, Math.max(12, viewportHeight * 0.026)),
  );
  const inputHeight = Math.max(
    50,
    Math.min(stageMetrics?.footer?.buttonHeight || 54, 56),
  );

  // ── Step-derived config ───────────────────────────────────────────────────
  const isOtpStep = step.key === "otp";
  const isEmailStep = step.key === "email";
  const isPhoneStep = step.key === "phone";
  const isOtpExpired =
    isOtpStep &&
    typeof otpRemainingSeconds === "number" &&
    otpRemainingSeconds <= 0;
  const actionMinWidth = isPhoneStep ? 104 : isOtpStep ? 118 : 108;

  // ── Phone step: country chip (leadingAccessory) + picker modal (trailingSlot)
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const leadingAccessory =
    isPhoneStep && phoneField ? (
      <MapCommitPhoneCountryChip
        country={phoneField.country}
        countryLoading={phoneField.countryLoading}
        titleColor={titleColor}
        mutedColor={mutedColor}
        onPress={() => setCountryPickerVisible(true)}
      />
    ) : null;
  const trailingSlot =
    isPhoneStep && phoneField ? (
      <CountryPickerModal
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(country) => {
          phoneField.onSelectCountry?.(country);
          setCountryPickerVisible(false);
        }}
      />
    ) : null;

  return (
    <MapAuthQuestionCard
      // Sizing
      orbSize={orbSize}
      titleFontSize={titleFontSize}
      titleLineHeight={titleLineHeight}
      cardPaddingTop={cardPaddingTop}
      cardPaddingBottom={24}
      inputHeight={inputHeight}
      formBlockMarginTop={18}
      // Content
      orbIcon="person-outline"
      title={step.title}
      description={step.description}
      // Input
      semanticType={isEmailStep ? "email" : isPhoneStep ? "phone" : "otp"}
      value={value}
      placeholder={step.placeholder}
      actionLabel={step.cta}
      actionMinWidth={actionMinWidth}
      keyboardType={
        isEmailStep ? "email-address" : isPhoneStep ? "phone-pad" : "number-pad"
      }
      maxLength={isOtpStep ? 6 : 120}
      clipboardAutofillOnFocus={isOtpStep}
      autoFocus
      showClearButton={isEmailStep || isPhoneStep}
      leadingAccessory={leadingAccessory}
      isSubmitting={isSubmitting}
      isDisabled={false}
      selectionColor={selectionColor}
      onChangeValue={onChangeValue}
      onSubmit={onSubmit}
      // OTP
      otpRemainingSeconds={isOtpStep ? otpRemainingSeconds : null}
      isOtpExpired={isOtpExpired}
      onResend={isOtpStep ? onResend : undefined}
      // Feedback
      errorMessage={errorMessage}
      successMessage={successMessage}
      // Colors
      titleColor={titleColor}
      mutedColor={mutedColor}
      accentColor={accentColor}
      errorColor={errorColor}
      successColor={successColor}
      statusTextColor={statusTextColor}
      inputSurfaceColor={inputSurfaceColor}
      avatarSurfaceColor={avatarSurfaceColor}
      resendSurfaceColor={resendSurfaceColor}
      disabledTextColor={disabledTextColor}
      // Phone trailing slot
      trailingSlot={trailingSlot}
    />
  );
}
