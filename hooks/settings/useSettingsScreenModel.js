import { useCallback, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { ThemeMode, useTheme } from "../../contexts/ThemeContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import {
  navigateToChangePassword,
  navigateToCreatePassword,
  navigateToHelpSupport,
  navigateToPayment,
} from "../../utils/navigationHelpers";
import { SETTINGS_SCREEN_COPY } from "../../components/settings/settingsScreen.content";

// PULLBACK NOTE: Settings screen model owns preference mutations, routing actions, and derived labels.
// It keeps the route/orchestrator free of row construction and toggle logic.

function countEnabled(values) {
  return values.filter(Boolean).length;
}

export function useSettingsScreenModel() {
  const router = useRouter();
  const { user, logout, syncUserData } = useAuth();
  const { isDarkMode, themeMode, setTheme } = useTheme();
  const {
    preferences,
    isLoading: isPreferencesLoading,
    refreshPreferences,
    updatePreferences,
  } = usePreferences();

  const preferencesReady =
    preferences !== null && typeof preferences === "object";

  const toggleThemeMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK);
  }, [isDarkMode, setTheme]);

  const togglePreference = useCallback(
    async (key) => {
      if (!preferencesReady) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updatePreferences({ [key]: !preferences[key] });
    },
    [preferences, preferencesReady, updatePreferences],
  );

  const openPassword = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.hasPassword) {
      navigateToChangePassword({ router });
      return;
    }
    navigateToCreatePassword({ router });
  }, [router, user?.hasPassword]);

  const openPayments = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToPayment({ router });
  }, [router]);

  const openHelpCenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToHelpSupport({ router });
  }, [router]);

  const openContactSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToHelpSupport({ router });
  }, [router]);

  const signOut = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const result = await logout();
    if (result?.success) {
      router.replace("/(auth)");
    }
    return result;
  }, [logout, router]);

  const refresh = useCallback(() => {
    syncUserData();
    refreshPreferences();
  }, [refreshPreferences, syncUserData]);

  const signedInAs = useMemo(
    () =>
      user?.email ||
      user?.phone ||
      user?.username ||
      SETTINGS_SCREEN_COPY.context.accountFallback,
    [user?.email, user?.phone, user?.username],
  );

  const themeSummary = useMemo(() => {
    if (themeMode === ThemeMode.SYSTEM) {
      return isDarkMode ? "System, currently dark" : "System, currently light";
    }
    return isDarkMode ? "Dark mode" : "Light mode";
  }, [isDarkMode, themeMode]);

  const notificationsSummary = useMemo(() => {
    if (!preferencesReady) return "Loading preferences";
    if (!preferences.notificationsEnabled) return "All notifications off";

    const enabledCount = countEnabled([
      preferences.appointmentReminders,
      preferences.emergencyUpdates,
      preferences.notificationSoundsEnabled,
    ]);

    if (enabledCount === 0) return "Notifications on, extras off";
    if (enabledCount === 1) return "1 extra alert enabled";
    return `${enabledCount} extra alerts enabled`;
  }, [preferences, preferencesReady]);

  const privacySummary = useMemo(() => {
    if (!preferencesReady) return "Loading privacy controls";

    const enabledCount = countEnabled([
      preferences.privacyShareMedicalProfile,
      preferences.privacyShareEmergencyContacts,
    ]);

    if (enabledCount === 0) return "No sharing enabled";
    if (enabledCount === 1) return "1 sharing control enabled";
    return `${enabledCount} sharing controls enabled`;
  }, [preferences, preferencesReady]);

  const securitySummary = useMemo(
    () => (user?.hasPassword ? "Password set" : "Password needed"),
    [user?.hasPassword],
  );

  const paymentsSummary = useMemo(
    () =>
      user?.hasInsurance
        ? "Coverage and payments available"
        : "Cards and billing",
    [user?.hasInsurance],
  );

  const supportSummary = useMemo(() => "Help and contact options ready", []);

  const sections = useMemo(() => {
    return [
      {
        key: "appearance",
        rows: [
          {
            key: "dark-mode",
            title: SETTINGS_SCREEN_COPY.rows.darkMode,
            iconName: isDarkMode ? "moon" : "sunny",
            tone: "system",
            trailing: "toggle",
            value: isDarkMode,
            onPress: toggleThemeMode,
          },
        ],
      },
      {
        key: "notifications",
        rows: [
          {
            key: "notifications-enabled",
            title: SETTINGS_SCREEN_COPY.rows.notifications,
            iconName: "notifications",
            tone: "system",
            trailing: "toggle",
            value: preferences?.notificationsEnabled === true,
            disabled: !preferencesReady,
            onPress: () => togglePreference("notificationsEnabled"),
          },
          {
            key: "appointment-reminders",
            title: SETTINGS_SCREEN_COPY.rows.appointmentReminders,
            iconName: "calendar",
            tone: "care",
            trailing: "toggle",
            value: preferences?.appointmentReminders === true,
            disabled:
              !preferencesReady || preferences?.notificationsEnabled !== true,
            onPress: () => togglePreference("appointmentReminders"),
          },
          {
            key: "emergency-updates",
            title: SETTINGS_SCREEN_COPY.rows.emergencyUpdates,
            iconName: "medical",
            tone: "care",
            trailing: "toggle",
            value: preferences?.emergencyUpdates === true,
            disabled:
              !preferencesReady || preferences?.notificationsEnabled !== true,
            onPress: () => togglePreference("emergencyUpdates"),
          },
          {
            key: "notification-sounds",
            title: SETTINGS_SCREEN_COPY.rows.notificationSounds,
            iconName: "volume-high",
            tone: "system",
            trailing: "toggle",
            value: preferences?.notificationSoundsEnabled === true,
            disabled: !preferencesReady,
            onPress: () => togglePreference("notificationSoundsEnabled"),
          },
        ],
      },
      {
        key: "privacy",
        rows: [
          {
            key: "share-medical",
            title: SETTINGS_SCREEN_COPY.rows.shareMedicalProfile,
            iconName: "document-text",
            tone: "profile",
            trailing: "toggle",
            value: preferences?.privacyShareMedicalProfile === true,
            disabled: !preferencesReady,
            onPress: () => togglePreference("privacyShareMedicalProfile"),
          },
          {
            key: "share-contacts",
            title: SETTINGS_SCREEN_COPY.rows.shareEmergencyContacts,
            iconName: "people",
            tone: "contacts",
            trailing: "toggle",
            value: preferences?.privacyShareEmergencyContacts === true,
            disabled: !preferencesReady,
            onPress: () => togglePreference("privacyShareEmergencyContacts"),
          },
        ],
      },
      {
        key: "account",
        rows: [
          {
            key: "password",
            title: user?.hasPassword
              ? SETTINGS_SCREEN_COPY.rows.changePassword
              : SETTINGS_SCREEN_COPY.rows.createPassword,
            iconName: "lock-closed",
            tone: "profile",
            trailing: "chevron",
            onPress: openPassword,
          },
          {
            key: "payments",
            title: SETTINGS_SCREEN_COPY.rows.managePayments,
            iconName: "card",
            tone: "payment",
            trailing: "chevron",
            onPress: openPayments,
          },
        ],
      },
      {
        key: "support",
        rows: [
          {
            key: "help-center",
            title: SETTINGS_SCREEN_COPY.rows.helpCenter,
            iconName: "help-circle",
            tone: "system",
            trailing: "chevron",
            onPress: openHelpCenter,
          },
          {
            key: "contact-support",
            title: SETTINGS_SCREEN_COPY.rows.contactSupport,
            iconName: "chatbubble-ellipses",
            tone: "system",
            trailing: "chevron",
            onPress: openContactSupport,
          },
        ],
      },
      {
        key: "session",
        rows: [
          {
            key: "sign-out",
            title: SETTINGS_SCREEN_COPY.rows.signOut,
            iconName: "log-out",
            tone: "destructive",
            destructive: true,
            trailing: "none",
            onPress: signOut,
          },
        ],
      },
    ];
  }, [
    isDarkMode,
    openContactSupport,
    openHelpCenter,
    openPassword,
    openPayments,
    preferences,
    preferencesReady,
    signOut,
    togglePreference,
    toggleThemeMode,
    user?.hasPassword,
  ]);

  return {
    user,
    isDarkMode,
    isDataLoading: isPreferencesLoading && !preferencesReady,
    preferencesReady,
    sections,
    signedInAs,
    themeSummary,
    notificationsSummary,
    privacySummary,
    securitySummary,
    paymentsSummary,
    supportSummary,
    openPassword,
    openPayments,
    openHelpCenter,
    openContactSupport,
    signOut,
    refresh,
  };
}
