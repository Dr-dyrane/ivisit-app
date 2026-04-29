export const DEPRECATED_FILE =
  "CompleteProfileScreen - Commit-details and emergency auth no longer hard-gate the app behind legacy profile setup";
("use client");

import { useCallback, useEffect, useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import useAuthViewport from "../hooks/ui/useAuthViewport";

// PULLBACK NOTE: This route remains for stale deep links and older navigation state only.
// OLD: CompleteProfileScreen was a required full-name + username form and blocked entry.
// NEW: The route is a deprecated fallback surface that lets the user continue immediately or open Profile.
// REASON: Commit-details and emergency auth no longer hard-gate the app behind legacy profile setup.

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { setHeaderState } = useHeaderState();
  const { resetHeader } = useScrollAwareHeader();
  const { resetTabBar } = useTabBarVisibility();
  const { user, syncUserData, logout } = useAuth();
  const {
    horizontalPadding,
    surfaceMaxWidth,
    bodyTextSize,
    bodyTextLineHeight,
  } = useAuthViewport();

  useEffect(() => {
    syncUserData();
  }, [syncUserData]);

  const signOutButton = useCallback(
    () => (
      <Pressable
        onPress={async () => {
          await logout();
          router.replace("/(auth)");
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.headerAction}
      >
        <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
      </Pressable>
    ),
    [logout, router],
  );

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      resetHeader();
      setHeaderState({
        title: "Profile setup",
        icon: (
          <Ionicons name="person-circle-outline" size={24} color="#FFFFFF" />
        ),
        backgroundColor: COLORS.brandPrimary,
        leftComponent: null,
        rightComponent: signOutButton(),
      });
    }, [resetHeader, resetTabBar, setHeaderState, signOutButton]),
  );

  const colors = useMemo(
    () => ({
      text: isDarkMode ? "#FFFFFF" : "#0F172A",
      textMuted: isDarkMode ? "#A8B2C5" : "#64748B",
      surface: isDarkMode ? "#101826" : "#FFFFFF",
      surfaceAlt: isDarkMode ? "#0C1320" : "#F8F4F4",
      border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
      secondaryButton: isDarkMode ? "rgba(255,255,255,0.08)" : "#EEF2FF",
      secondaryText: isDarkMode ? "#E2E8F0" : "#1E293B",
    }),
    [isDarkMode],
  );

  const backgroundColors = useMemo(
    () =>
      isDarkMode
        ? ["#101826", "#0A1020", "#101826"]
        : ["#FFFDFC", "#F6ECEB", "#FFFDFC"],
    [isDarkMode],
  );

  const phone = typeof user?.phone === "string" ? user.phone.trim() : "";
  const email = typeof user?.email === "string" ? user.email.trim() : "";
  const hasPhone = phone.length > 0;
  const signedInAs =
    phone || email || user?.fullName || user?.username || "Signed-in account";

  const phoneStatusTitle = hasPhone ? "Phone on file" : "Phone missing";
  const phoneStatusBody = hasPhone
    ? "This account already has a phone number. Continue normally."
    : "Add a working phone number from Profile when you are ready.";

  const bottomPadding =
    STACK_TOP_PADDING + insets.bottom + (Platform.OS === "ios" ? 28 : 20);

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: STACK_TOP_PADDING,
            paddingBottom: bottomPadding,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View
          style={[styles.surface, { maxWidth: Math.min(surfaceMaxWidth, 760) }]}
        >
          <View
            style={[
              styles.card,
              styles.heroCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.heroIcon}>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={22}
                color={COLORS.brandPrimary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Profile setup moved
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.textMuted,
                  fontSize: bodyTextSize,
                  lineHeight: bodyTextLineHeight,
                },
              ]}
            >
              iVisit no longer stops you here. Continue to the app, or open
              Profile if you want to add a phone number.
            </Text>
          </View>

          <View
            style={[
              styles.card,
              styles.detailCard,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                Signed in as
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {signedInAs}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {phoneStatusTitle}
              </Text>
              <Text
                style={[
                  styles.detailHint,
                  {
                    color: hasPhone
                      ? COLORS.success || "#16A34A"
                      : colors.textMuted,
                  },
                ]}
              >
                {hasPhone ? phone : phoneStatusBody}
              </Text>
            </View>
            {!hasPhone ? (
              <Text
                style={[
                  styles.detailSupport,
                  {
                    color: colors.textMuted,
                    fontSize: bodyTextSize,
                    lineHeight: bodyTextLineHeight,
                  },
                ]}
              >
                Emergency and care flows can ask for a phone number later
                without forcing this route.
              </Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.replace("/(user)")}
              style={({ pressed }) => [
                styles.primaryButton,
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Ionicons name="home-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Continue to iVisit</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/(user)/(stacks)/profile")}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: colors.secondaryButton,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.secondaryText}
              />
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.secondaryText },
                ]}
              >
                Open Profile
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  surface: {
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  card: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
  },
  heroCard: {
    gap: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 70, 229, 0.08)",
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontWeight: "400",
  },
  detailCard: {
    gap: 14,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  detailHint: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  detailSupport: {
    fontWeight: "400",
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 22,
    backgroundColor: COLORS.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 54,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
