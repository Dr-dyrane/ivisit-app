import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapInlineActionInput from "./MapInlineActionInput";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ─── component ───────────────────────────────────────────────────────────────

/**
 * MapAuthQuestionCard
 *
 * Shared pure-render card that enforces the visual grammar used across every
 * auth question step on the /map surface:
 *
 *   orb → title → description → input → OTP status row → feedback → trailingSlot
 *
 * OWNERSHIP RULES
 * ───────────────
 * • This component owns: structure, spacing, the OTP status row, feedback text.
 * • Callers own: all logic, state, handlers, sizing numbers, colors, and any
 *   step-specific trailing content (Google button, CountryPickerModal, etc.).
 *
 * SIZING CONTRACT
 * ───────────────
 * Every size prop is a pre-computed number. Callers derive these from whichever
 * metrics hook fits their context (useMapStageResponsiveMetrics for sheet phases,
 * useResponsiveSurfaceMetrics for overlay modals). The card itself is
 * metrics-agnostic so it renders correctly in both contexts.
 *
 * TRAILING SLOT
 * ─────────────
 * Pass a ReactNode as `trailingSlot` for step-specific content appended below
 * the input row (e.g. divider + Google button on the email step, or a
 * CountryPickerModal trigger on the phone step). The slot renders after the
 * feedback text so error messages always appear adjacent to the input.
 *
 * @param {object} props
 *
 * Sizing — all pre-computed by the caller:
 * @param {number}  [orbSize=80]           - orb diameter in dp
 * @param {number}  [titleFontSize=26]     - question title font size
 * @param {number}  [titleLineHeight=30]   - question title line height
 * @param {number}  [cardPaddingTop=18]    - top padding of the card container
 * @param {number}  [cardPaddingBottom=24] - bottom padding of the card container
 * @param {number}  [inputHeight=52]       - height of the inline action input
 * @param {number}  [formBlockMarginTop=20]- gap between the description and form
 *
 * Content:
 * @param {string}  [orbIcon="person-outline"] - Ionicons name for the orb icon
 * @param {string}  title                      - question headline
 * @param {string}  [description]              - quieter support line below title
 *
 * Input config:
 * @param {string}  [semanticType="text"]     - "email" | "otp" | "phone" | "text"
 * @param {string}  [value=""]
 * @param {string}  [placeholder=""]
 * @param {string}  [actionLabel="Continue"]
 * @param {number}  [actionMinWidth=108]
 * @param {string}  [keyboardType]
 * @param {number}  [maxLength]
 * @param {boolean} [clipboardAutofillOnFocus=false]
 * @param {boolean} [autoFocus=false]
 * @param {boolean} [showClearButton=false]
 * @param {*}       [leadingAccessory=null]   - ReactNode rendered inside the input
 * @param {boolean} [isSubmitting=false]
 * @param {boolean} [isDisabled=false]
 * @param {string}  [selectionColor]
 * @param {Function} onChangeValue
 * @param {Function} onSubmit
 *
 * OTP status row (rendered only when otpRemainingSeconds is not null):
 * @param {number|null} [otpRemainingSeconds=null]
 * @param {boolean}     [isOtpExpired=false]
 * @param {Function}    [onResend]
 *
 * Feedback:
 * @param {string} [errorMessage=""]
 * @param {string} [successMessage=""]
 *
 * Colors — all required when the component is in use:
 * @param {string} titleColor
 * @param {string} mutedColor
 * @param {string} accentColor
 * @param {string} errorColor
 * @param {string} successColor
 * @param {string} statusTextColor    - color for OTP countdown when not expired
 * @param {string} inputSurfaceColor  - background of the inline input
 * @param {string} avatarSurfaceColor - background of the orb
 * @param {string} [resendSurfaceColor] - background of the resend pill; defaults to transparent
 * @param {string} [disabledTextColor]  - text color when resend is disabled; defaults to mutedColor
 *
 * Extra content:
 * @param {*} [trailingSlot=null] - ReactNode appended below the feedback area
 */
export default function MapAuthQuestionCard({
  // Sizing
  orbSize = 80,
  titleFontSize = 26,
  titleLineHeight = 30,
  cardPaddingTop = 18,
  cardPaddingBottom = 24,
  inputHeight = 52,
  formBlockMarginTop = 20,

  // Content
  orbIcon = "person-outline",
  title,
  description,

  // Input
  semanticType = "text",
  value = "",
  placeholder = "",
  actionLabel = "Continue",
  actionMinWidth = 108,
  keyboardType,
  maxLength,
  clipboardAutofillOnFocus = false,
  autoFocus = false,
  showClearButton = false,
  leadingAccessory = null,
  isSubmitting = false,
  isDisabled = false,
  selectionColor,
  onChangeValue,
  onSubmit,

  // OTP
  otpRemainingSeconds = null,
  isOtpExpired = false,
  onResend,

  // Feedback
  errorMessage = "",
  successMessage = "",

  // Colors
  titleColor,
  mutedColor,
  accentColor,
  errorColor,
  successColor,
  statusTextColor,
  inputSurfaceColor,
  avatarSurfaceColor,
  resendSurfaceColor,
  disabledTextColor,

  // Trailing slot
  trailingSlot = null,
}) {
  const orbRadius = Math.round(orbSize / 2);
  const orbIconSize = Math.round(orbSize * 0.43);
  const showOtpRow = otpRemainingSeconds != null;
  const resolvedResendTextColor = isSubmitting
    ? (disabledTextColor || mutedColor)
    : accentColor;

  return (
    <View
      style={[
        styles.card,
        { paddingTop: cardPaddingTop, paddingBottom: cardPaddingBottom },
      ]}
    >

      {/* ── Orb + headline ─────────────────────────────────────────────── */}
      <View style={styles.heroBlock}>
        <View
          style={[
            styles.avatarOrb,
            {
              width: orbSize,
              height: orbSize,
              borderRadius: orbRadius,
              backgroundColor: avatarSurfaceColor,
            },
          ]}
        >
          <Ionicons
            name={orbIcon}
            size={orbIconSize}
            color={mutedColor}
          />
        </View>

        <Text
          style={[
            styles.title,
            {
              color: titleColor,
              fontSize: titleFontSize,
              lineHeight: titleLineHeight,
            },
          ]}
        >
          {title}
        </Text>

        {description ? (
          <Text style={[styles.description, { color: mutedColor }]}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <View style={[styles.formBlock, { marginTop: formBlockMarginTop }]}>

        {/* Input */}
        <MapInlineActionInput
          semanticType={semanticType}
          autoFocus={autoFocus}
          leadingAccessory={leadingAccessory}
          value={value}
          onChangeText={onChangeValue}
          onSubmit={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={mutedColor}
          textColor={titleColor}
          backgroundColor={inputSurfaceColor}
          actionLabel={actionLabel}
          actionMinWidth={actionMinWidth}
          height={inputHeight}
          loading={isSubmitting}
          disabled={isDisabled}
          containerStyle={styles.inputShell}
          autoCapitalize="none"
          autoCorrect={false}
          clipboardAutofillOnFocus={clipboardAutofillOnFocus}
          keyboardType={keyboardType}
          preserveFocusOnSubmit={semanticType !== "otp"}
          returnKeyType="go"
          maxLength={maxLength}
          selectionColor={selectionColor || accentColor}
          showClearButton={showClearButton}
        />

        {/* OTP status row — countdown + resend */}
        {showOtpRow ? (
          <View style={styles.otpRow}>
            <Text
              style={[
                styles.otpCountdown,
                { color: isOtpExpired ? errorColor : statusTextColor },
              ]}
            >
              {isOtpExpired
                ? "Code expired"
                : `Expires in ${formatCountdown(otpRemainingSeconds ?? 0)}`}
            </Text>

            {typeof onResend === "function" ? (
              <Pressable
                onPress={onResend}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Resend code"
                style={({ pressed }) => [
                  styles.resendPill,
                  resendSurfaceColor
                    ? { backgroundColor: resendSurfaceColor }
                    : null,
                  pressed && !isSubmitting ? styles.resendPillPressed : null,
                  isSubmitting ? styles.resendPillDisabled : null,
                ]}
              >
                <Text
                  style={[
                    styles.resendText,
                    { color: resolvedResendTextColor },
                  ]}
                >
                  Resend code
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Inline feedback — error takes priority over success */}
        {errorMessage ? (
          <Text style={[styles.feedbackText, { color: errorColor }]}>
            {errorMessage}
          </Text>
        ) : successMessage ? (
          <Text style={[styles.feedbackText, { color: successColor }]}>
            {successMessage}
          </Text>
        ) : null}

        {/* Step-specific trailing content (Google button, pickers, etc.) */}
        {trailingSlot ?? null}
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Outer card — callers set paddingTop and paddingBottom inline
  card: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
  },

  // Hero block — orb + headline stack, horizontally centred
  heroBlock: {
    alignItems: "center",
  },

  // Orb — caller provides width, height, borderRadius, backgroundColor inline
  avatarOrb: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
    // Soft elevation so the orb lifts off the sheet surface
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  // Question title — caller provides fontSize and lineHeight inline
  title: {
    fontWeight: "900",
    letterSpacing: -0.7,
    textAlign: "center",
  },

  // Support line below the title
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    textAlign: "center",
    maxWidth: 320,
  },

  // Form container — maxWidth matches MapInlineActionInput's comfortable width
  formBlock: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
  },

  // Shell passed to MapInlineActionInput so it stretches to the formBlock width
  inputShell: {
    maxWidth: 390,
    width: "100%",
  },

  // OTP countdown row
  otpRow: {
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  otpCountdown: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  // Resend pill
  resendPill: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  resendPillPressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  resendPillDisabled: {
    opacity: 0.58,
  },
  resendText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  // Inline feedback text (error or success), below the OTP row if present
  feedbackText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
});
