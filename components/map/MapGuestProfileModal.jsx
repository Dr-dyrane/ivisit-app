import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSocialAuth } from "../../hooks/auth";
import { authService } from "../../services/authService";
import { contactInputMemoryService } from "../../services/contactInputMemoryService";
import {
  normalizeApiErrorMessage,
  waitForMinimumPending,
} from "../../utils/ui/apiInteractionFeedback";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import MapAuthQuestionCard from "./shared/MapAuthQuestionCard";
import MapModalShell from "./surfaces/MapModalShell";

// Ensure any in-progress OAuth session is closed cleanly on mount
WebBrowser.maybeCompleteAuthSession();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function formatCountdown(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/**
 * MapGuestProfileModal
 *
 * Self-contained identity gate for unauthenticated users on the /map surface.
 *
 * Two auth paths:
 *   1. Email → OTP verification (no password, no profile form, profile
 *      completion is deferred so urgent intent is never interrupted)
 *   2. Google OAuth (fastest lane for returning users)
 *
 * Email is pre-filled from contactInputMemoryService when the user has
 * previously completed a commit-details flow — this is the learned-behaviour
 * bridge so the modal never feels cold for a returning user.
 *
 * Props
 * ─────
 * visible        boolean   show/hide the modal
 * onClose        () => void  dismiss without auth (e.g. backdrop tap)
 * onAuthSuccess  () => void  called immediately after a successful sign-in;
 *                            the modal closes itself first, caller can react
 *                            to AuthContext state change independently
 */
export default function MapGuestProfileModal({
  visible,
  onClose,
  onAuthSuccess,
}) {
  const { isDarkMode } = useTheme();
  const { login, syncUserData } = useAuth();
  const { signInWithProvider } = useSocialAuth();
  const viewportMetrics = useResponsiveSurfaceMetrics({
    presentationMode: "modal",
  });

  // ─── Step state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // ─── Async state ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ─── OTP countdown ────────────────────────────────────────────────────────
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpCountdownTick, setOtpCountdownTick] = useState(0);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const emailRef = useRef(email);
  const otpAutoSubmittedRef = useRef("");
  const hydratedMemoryRef = useRef(false);

  // ─── Colors ───────────────────────────────────────────────────────────────
  const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
  const inputSurface = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.05)";
  const avatarSurface = isDarkMode
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.05)";
  const googleSurface = isDarkMode
    ? "rgba(255,255,255,0.07)"
    : "rgba(15,23,42,0.04)";
  const dividerColor = isDarkMode
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.09)";
  const errorColor = isDarkMode ? "#FCA5A5" : "#B91C1C";
  const successColor = isDarkMode ? "#A7F3D0" : "#047857";
  const accentColor = isDarkMode ? "#FCA5A5" : "#86100E";
  const statusColor = isDarkMode ? "#CBD5E1" : "#334155";

  // ─── Sizing (pre-computed from modal metrics, passed to MapAuthQuestionCard)
  const orbSize = Math.round(
    Math.min(88, Math.max(72, (viewportMetrics.radius?.orb || 44) * 1.4)),
  );
  const titleFontSize = Math.max(26, (viewportMetrics.type?.title || 22) + 6);
  const titleLineHeight = Math.max(
    30,
    (viewportMetrics.type?.titleLineHeight || 26) + 6,
  );
  const cardPaddingTop = Math.round(
    Math.min(22, Math.max(12, (viewportMetrics.modal?.height || 852) * 0.026)),
  );
  const inputHeight = Math.max(
    50,
    Math.min(viewportMetrics.cta?.primaryHeight || 54, 56),
  );

  // ─── Derived ──────────────────────────────────────────────────────────────
  const isEmailStep = step === "email";
  const isOtpStep = step === "otp";
  const trimmedEmail = String(email || "").trim();
  const cleanOtp = String(otp || "")
    .replace(/\D/g, "")
    .slice(0, 6);

  // ─── Reset on close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) return;
    setStep("email");
    setOtp("");
    setIsSubmitting(false);
    setIsGoogleSubmitting(false);
    setErrorMessage("");
    setSuccessMessage("");
    setOtpExpiresAt(null);
    hydratedMemoryRef.current = false;
    otpAutoSubmittedRef.current = "";
  }, [visible]);

  // ─── Hydrate email from contact memory ───────────────────────────────────
  // When the user previously completed a commit-details flow the service
  // remembers their email.  Pre-fill it here so the modal never feels cold.
  useEffect(() => {
    if (!visible || hydratedMemoryRef.current || trimmedEmail) return undefined;
    let cancelled = false;
    hydratedMemoryRef.current = true;
    contactInputMemoryService
      .getMemory()
      .then((memory) => {
        if (cancelled || emailRef.current) return;
        if (memory?.lastEmail) {
          setEmail(memory.lastEmail);
        }
      })
      .catch((err) => {
        console.warn(
          "[MapGuestProfileModal] Memory hydration failed:",
          err?.message,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [visible, trimmedEmail]);

  // Keep emailRef in sync for the memory hydration guard above
  useEffect(() => {
    emailRef.current = trimmedEmail;
  }, [trimmedEmail]);

  // ─── OTP countdown ticker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOtpStep || !otpExpiresAt) return undefined;
    setOtpCountdownTick(Date.now());
    const id = setInterval(() => setOtpCountdownTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOtpStep, otpExpiresAt]);

  const otpRemainingSeconds = useMemo(() => {
    if (!isOtpStep || !otpExpiresAt) return null;
    const now = otpCountdownTick || Date.now();
    return Math.max(0, Math.ceil((otpExpiresAt - now) / 1000));
  }, [isOtpStep, otpExpiresAt, otpCountdownTick]);

  const isOtpExpired =
    typeof otpRemainingSeconds === "number" && otpRemainingSeconds <= 0;

  // ─── Auth completion ──────────────────────────────────────────────────────
  const handleAuthDone = useCallback(
    async (userData) => {
      try {
        await login(userData);
        await syncUserData?.();
        onClose?.();
        onAuthSuccess?.();
      } catch (err) {
        console.warn(
          "[MapGuestProfileModal] Auth finalization error:",
          err?.message,
        );
      }
    },
    [login, onAuthSuccess, onClose, syncUserData],
  );

  // ─── Submit email ─────────────────────────────────────────────────────────
  const handleSubmitEmail = useCallback(async () => {
    if (!trimmedEmail) return;
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    const pendingStartedAt = Date.now();
    try {
      // Defer profile completion so auth never blocks urgent intent
      await authService.setEmergencyProfileCompletionDeferred?.(true);
      const result = await authService.requestOtp({
        email: trimmedEmail,
        reviewDemoAuthAllowed: true,
      });
      await waitForMinimumPending(pendingStartedAt, 600);
      if (!result?.success) {
        setErrorMessage(
          normalizeApiErrorMessage(result?.error, "Could not send code."),
        );
        return;
      }
      void contactInputMemoryService.rememberEmail(trimmedEmail);
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_MS);
      setOtpCountdownTick(Date.now());
      setOtp("");
      otpAutoSubmittedRef.current = "";
      setStep("otp");
      setSuccessMessage(`Code sent to ${trimmedEmail}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [trimmedEmail]);

  // ─── Submit OTP ───────────────────────────────────────────────────────────
  const handleSubmitOtp = useCallback(
    async (otpOverride) => {
      const resolvedOtp = String(otpOverride || cleanOtp || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (resolvedOtp.length !== 6) {
        setErrorMessage("Enter the 6-digit code.");
        return;
      }
      if (otpExpiresAt && Date.now() >= otpExpiresAt) {
        setErrorMessage("Code expired. Request a new one.");
        return;
      }
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      const pendingStartedAt = Date.now();
      try {
        const result = await authService.verifyOtp({
          email: trimmedEmail,
          otp: resolvedOtp,
          reviewDemoAuthAllowed: true,
        });
        await waitForMinimumPending(pendingStartedAt, 600);
        if (!result?.success) {
          setErrorMessage(
            normalizeApiErrorMessage(
              result?.error,
              "Code didn't work. Try again.",
            ),
          );
          return;
        }
        await handleAuthDone(result.data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [cleanOtp, handleAuthDone, otpExpiresAt, trimmedEmail],
  );

  // ─── Auto-submit OTP when 6 digits are entered ───────────────────────────
  useEffect(() => {
    if (!isOtpStep || isSubmitting) return;
    const digits = String(otp || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (digits.length !== 6) return;
    if (otpAutoSubmittedRef.current === digits) return;
    otpAutoSubmittedRef.current = digits;
    void handleSubmitOtp(digits);
  }, [handleSubmitOtp, isOtpStep, isSubmitting, otp]);

  // ─── Resend OTP ───────────────────────────────────────────────────────────
  const handleResendOtp = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await authService.requestOtp({
        email: trimmedEmail,
        reviewDemoAuthAllowed: true,
      });
      if (!result?.success) {
        setErrorMessage(
          normalizeApiErrorMessage(result?.error, "Could not resend code."),
        );
        return;
      }
      setOtp("");
      setOtpExpiresAt(Date.now() + OTP_EXPIRY_MS);
      setOtpCountdownTick(Date.now());
      otpAutoSubmittedRef.current = "";
      setSuccessMessage("New code sent.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, trimmedEmail]);

  // ─── Google sign-in ───────────────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleSubmitting(true);
    setErrorMessage("");
    try {
      const { success, error, pendingRedirect } = await signInWithProvider(
        "google",
        {
          deferProfileCompletion: true,
          returnTo: "/(auth)/map",
        },
      );
      // On web, OAuth triggers a full-page redirect; the modal will be
      // unmounted naturally so there is nothing else to do here.
      if (pendingRedirect) return;
      if (success) {
        onClose?.();
        onAuthSuccess?.();
      } else if (
        error &&
        !String(error).includes("cancelled") &&
        !String(error).includes("dismiss")
      ) {
        setErrorMessage("Google sign-in failed. Try email instead.");
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [onAuthSuccess, onClose, signInWithProvider]);

  // ─── Input handlers ───────────────────────────────────────────────────────
  const handleEmailChange = useCallback((value) => {
    setErrorMessage("");
    setEmail(value);
    if (!String(value || "").trim()) {
      void contactInputMemoryService.forgetEmail();
    }
  }, []);

  const handleOtpChange = useCallback((value) => {
    setErrorMessage("");
    setSuccessMessage("");
    setOtp(
      String(value || "")
        .replace(/\D/g, "")
        .slice(0, 6),
    );
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setStep("email");
    setOtp("");
    setErrorMessage("");
    setSuccessMessage("");
    otpAutoSubmittedRef.current = "";
  }, []);

  // ─── Google trailing slot (email step only) ───────────────────────────────
  const googleTrailingSlot = useMemo(
    () => (
      <View style={styles.googleSlot}>
        <View style={styles.divider}>
          <View
            style={[styles.dividerLine, { backgroundColor: dividerColor }]}
          />
          <Text style={[styles.dividerLabel, { color: mutedColor }]}>or</Text>
          <View
            style={[styles.dividerLine, { backgroundColor: dividerColor }]}
          />
        </View>
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={isGoogleSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={({ pressed }) => [
            styles.googleRow,
            { backgroundColor: googleSurface },
            pressed && !isGoogleSubmitting ? styles.googleRowPressed : null,
            isGoogleSubmitting ? styles.googleRowDisabled : null,
          ]}
        >
          <Ionicons name="logo-google" size={18} color={titleColor} />
          <Text
            style={[styles.googleLabel, { color: titleColor }]}
            numberOfLines={1}
          >
            {isGoogleSubmitting ? "Signing in\u2026" : "Continue with Google"}
          </Text>
          {!isGoogleSubmitting ? (
            <Ionicons
              name="chevron-forward"
              size={15}
              color={mutedColor}
              style={styles.googleChevron}
            />
          ) : null}
        </Pressable>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dividerColor,
      googleSurface,
      handleGoogleSignIn,
      isGoogleSubmitting,
      mutedColor,
      titleColor,
    ],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <MapModalShell
      visible={visible}
      onClose={onClose}
      onBack={isOtpStep ? handleBack : undefined}
      backAccessibilityLabel="Back to email"
      title={null}
      enableSnapDetents={false}
      presentationModeOverride={Platform.OS === "web" ? "left-drawer" : null}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(
            8,
            (viewportMetrics.insets?.sectionGap || 12) - 4,
          ),
          paddingBottom: Math.max(
            20,
            (viewportMetrics.insets?.largeGap || 24) + 8,
          ),
          paddingHorizontal: viewportMetrics.insets?.horizontal || 20,
        },
      ]}
    >
      <View style={styles.stage}>
        {/* Back chevron — OTP step only, sits above the card */}
        <MapAuthQuestionCard
          // Sizing
          orbSize={orbSize}
          titleFontSize={titleFontSize}
          titleLineHeight={titleLineHeight}
          cardPaddingTop={cardPaddingTop}
          cardPaddingBottom={0}
          inputHeight={inputHeight}
          formBlockMarginTop={Math.max(
            20,
            viewportMetrics.insets?.largeGap || 24,
          )}
          // Content
          orbIcon={isEmailStep ? "person-outline" : "shield-checkmark-outline"}
          title={isEmailStep ? "What's your email?" : "Enter the code"}
          description={
            isEmailStep
              ? "We'll send a one-time verification code."
              : `Sent to ${trimmedEmail}`
          }
          // Input
          semanticType={isEmailStep ? "email" : "otp"}
          value={isEmailStep ? email : otp}
          placeholder={isEmailStep ? "you@example.com" : "6-digit code"}
          actionLabel={isEmailStep ? "Send code" : "Verify"}
          actionMinWidth={isEmailStep ? 108 : 88}
          keyboardType={isEmailStep ? "email-address" : "number-pad"}
          maxLength={isOtpStep ? 6 : undefined}
          clipboardAutofillOnFocus={isOtpStep}
          autoFocus
          showClearButton={isEmailStep}
          isSubmitting={isSubmitting}
          isDisabled={
            isEmailStep
              ? !trimmedEmail || isSubmitting
              : cleanOtp.length !== 6 || isSubmitting
          }
          selectionColor={accentColor}
          onChangeValue={isEmailStep ? handleEmailChange : handleOtpChange}
          onSubmit={isEmailStep ? handleSubmitEmail : () => handleSubmitOtp()}
          // OTP status row
          otpRemainingSeconds={isOtpStep ? otpRemainingSeconds : null}
          isOtpExpired={isOtpExpired}
          onResend={isOtpStep ? handleResendOtp : undefined}
          // Feedback
          errorMessage={errorMessage}
          successMessage={isOtpStep ? successMessage : ""}
          // Colors
          titleColor={titleColor}
          mutedColor={mutedColor}
          accentColor={accentColor}
          errorColor={errorColor}
          successColor={successColor}
          statusTextColor={statusColor}
          inputSurfaceColor={inputSurface}
          avatarSurfaceColor={avatarSurface}
          // Google button as trailing slot on email step only
          trailingSlot={isEmailStep ? googleTrailingSlot : null}
        />
      </View>
    </MapModalShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  stage: {
    flexGrow: 1,
  },

  // Back button — shown above the card on the OTP step
  // Google trailing slot — wrapper that owns the divider + button
  googleSlot: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
  },

  // Divider between email input and Google button
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Google sign-in row
  googleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 26,
    borderCurve: "continuous",
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 12,
    width: "100%",
  },
  googleRowPressed: {
    transform: [{ scale: 0.98 }, { translateY: 1 }],
    opacity: 0.88,
  },
  googleRowDisabled: {
    opacity: 0.62,
  },
  googleLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  googleChevron: {
    flexShrink: 0,
  },
});
