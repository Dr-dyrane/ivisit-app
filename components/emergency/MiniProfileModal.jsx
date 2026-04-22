import { useCallback, useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useVisits } from "../../contexts/VisitsContext";
import { COLORS } from "../../constants/colors";
import { useMedicalProfile } from "../../hooks/user/useMedicalProfile";
import useResponsiveSurfaceMetrics from "../../hooks/ui/useResponsiveSurfaceMetrics";
import MapModalShell from "../map/surfaces/MapModalShell";
import {
  navigateToMedicalProfile,
  navigateToProfile,
  navigateToVisits,
} from "../../utils/navigationHelpers";
import { waitForMinimumPending } from "../../utils/ui/apiInteractionFeedback";

export default function MiniProfileModal({
  visible,
  onClose,
  onSignOut,
  showMapShortcut = true,
  preferDrawerPresentation = false,
}) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const { visitCounts } = useVisits();
  const { profile: medicalProfile } = useMedicalProfile();
  const router = useRouter();
  const viewportMetrics = useResponsiveSurfaceMetrics({
    presentationMode: preferDrawerPresentation ? "modal" : "sheet",
  });
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsSigningOut(false);
    }
  }, [visible]);

  const requestClose = useCallback(
    ({ withHaptic = true, afterClose = null, force = false } = {}) => {
      if (isSigningOut && !force) return;
      if (withHaptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onClose?.();
      if (typeof afterClose === "function") {
        setTimeout(afterClose, 300);
      }
    },
    [isSigningOut, onClose],
  );

  const executeNav = useCallback(
    (navFn) => {
      if (isSigningOut) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      requestClose({
        withHaptic: false,
        afterClose: () => navFn({ router }),
      });
    },
    [isSigningOut, requestClose, router],
  );

  const handleOpenMap = useCallback(() => {
    if (isSigningOut) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestClose({
      withHaptic: false,
      afterClose: () => router.replace("/(auth)/map"),
    });
  }, [isSigningOut, requestClose, router]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut || typeof onSignOut !== "function") return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSigningOut(true);

    try {
      const result = await waitForMinimumPending(Promise.resolve(onSignOut()));
      if (result?.success === false) {
        setIsSigningOut(false);
        return;
      }
      requestClose({ withHaptic: false, force: true });
    } catch (error) {
      console.error("[MiniProfileModal] Sign out failed:", error);
      setIsSigningOut(false);
    }
  }, [isSigningOut, onSignOut, requestClose]);

  const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
  const textMuted = isDarkMode ? "#94A3B8" : "#64748B";
  const widgetBg = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const signOutSurface = isDarkMode
    ? "rgba(239,68,68,0.14)"
    : "rgba(134,16,14,0.10)";
  const signOutText = isDarkMode ? "#FCA5A5" : "#86100E";
  const contentHorizontalPadding = viewportMetrics.insets?.horizontal || 20;
  const contentTopPadding = Math.max(
    8,
    Math.min(18, viewportMetrics.insets?.sectionGap || 14),
  );
  const contentBottomPadding = Math.max(
    36,
    (viewportMetrics.insets?.sectionGap || 16) + 20,
  );

  return (
    <MapModalShell
      visible={visible}
      onClose={requestClose}
      enableSnapDetents={false}
      matchExpandedSheetHeight={false}
      minHeightRatio={0.62}
      maxHeightRatio={0.9}
      presentationModeOverride={
        preferDrawerPresentation ? "left-drawer" : "bottom-sheet"
      }
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: contentHorizontalPadding,
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
        },
      ]}
    >
      <View style={styles.profileHeader}>
        <Pressable
          onPress={() => executeNav(navigateToProfile)}
          style={styles.avatarContainer}
        >
          <Image
            source={
              user?.imageUri
                ? { uri: user.imageUri }
                : require("../../assets/profile.jpg")
            }
            style={styles.avatarImage}
          />
          <View style={styles.activeSeal}>
            <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
          </View>
        </Pressable>
        <Text style={[styles.userName, { color: textColor }]}>
          {user?.fullName || "User Profile"}
        </Text>
        <Text style={[styles.userEmail, { color: textMuted }]}>
          {user?.email || "medical@ivisit.com"}
        </Text>
        {typeof onSignOut === "function" ? (
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={[
              styles.signOutButton,
              {
                backgroundColor: signOutSurface,
                opacity: isSigningOut ? 0.72 : 1,
              },
            ]}
          >
            <Text style={[styles.signOutButtonText, { color: signOutText }]}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => executeNav(navigateToVisits)}
        style={[styles.widget, { backgroundColor: widgetBg }]}
      >
        <View style={styles.widgetHeader}>
          <Text style={[styles.widgetTitle, { color: textColor }]}>
            YOUR VISITS
          </Text>
          <Ionicons
            name="arrow-forward-circle"
            size={24}
            color={COLORS.brandPrimary}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.brandPrimary }]}>
              {visitCounts?.upcoming || 0}
            </Text>
            <Text style={[styles.statLabel, { color: textMuted }]}>
              UPCOMING
            </Text>
          </View>
          <View
            style={[
              styles.divider,
              { backgroundColor: isDarkMode ? "#1E293B" : "#E2E8F0" },
            ]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: textColor }]}>
              {visitCounts?.completed || 0}
            </Text>
            <Text style={[styles.statLabel, { color: textMuted }]}>
              HISTORY
            </Text>
          </View>
        </View>
      </Pressable>

      {showMapShortcut ? (
        <Pressable
          onPress={handleOpenMap}
          style={[
            styles.widget,
            styles.mapWidget,
            {
              backgroundColor: isDarkMode
                ? "rgba(134,16,14,0.18)"
                : "rgba(134,16,14,0.08)",
              marginTop: 16,
            },
          ]}
        >
          <View style={styles.widgetHeader}>
            <View style={styles.mapWidgetLeft}>
              <View
                style={[
                  styles.mapIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(134,16,14,0.28)"
                      : "rgba(134,16,14,0.14)",
                  },
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={18}
                  color={isDarkMode ? "#FCA5A5" : "#86100E"}
                />
              </View>
              <View style={styles.mapWidgetCopy}>
                <Text
                  style={[
                    styles.widgetTitle,
                    { color: isDarkMode ? "#FCA5A5" : "#86100E" },
                  ]}
                >
                  EMERGENCY MAP
                </Text>
                <Text
                  style={[
                    styles.mapWidgetSub,
                    {
                      color: isDarkMode
                        ? "rgba(252,165,165,0.72)"
                        : "rgba(134,16,14,0.68)",
                    },
                  ]}
                >
                  Find nearby hospitals & request help
                </Text>
              </View>
            </View>
            <Ionicons
              name="arrow-forward-circle"
              size={24}
              color={isDarkMode ? "#FCA5A5" : "#86100E"}
            />
          </View>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.widget,
          { backgroundColor: widgetBg, marginTop: 16 },
        ]}
      >
        <Pressable
          onPress={() => executeNav(navigateToMedicalProfile)}
          style={styles.widgetHeader}
        >
          <Text style={[styles.widgetTitle, { color: textColor }]}>
            MEDICAL PASSPORT
          </Text>
          <Text style={styles.editLabel}>VIEW ALL</Text>
        </Pressable>

        {[
          {
            label: "Blood Type",
            icon: "water",
            value: medicalProfile?.bloodType || "Not set",
          },
          {
            label: "Allergies",
            icon: "warning",
            value: medicalProfile?.allergies || "None",
          },
          {
            label: "Medications",
            icon: "medical",
            value: medicalProfile?.medications || "None",
          },
        ].map((item, index) => (
          <Pressable
            key={index}
            onPress={() => executeNav(navigateToMedicalProfile)}
            style={[
              styles.medicalItem,
              {
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: isDarkMode ? "#1E293B" : "#E2E8F0",
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: COLORS.brandPrimary + "15" },
              ]}
            >
              <Ionicons name={item.icon} size={18} color={COLORS.brandPrimary} />
            </View>
            <View style={styles.medicalInfo}>
              <Text style={[styles.medicalLabel, { color: textMuted }]}>
                {item.label}
              </Text>
              <Text style={[styles.medicalValue, { color: textColor }]}>
                {item.value}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textMuted} />
          </Pressable>
        ))}
      </View>
    </MapModalShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  profileHeader: { alignItems: "center", marginBottom: 32 },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: COLORS.brandPrimary,
  },
  activeSeal: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.brandPrimary,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  userName: { fontSize: 24, fontWeight: "900", letterSpacing: -0.8 },
  userEmail: { fontSize: 14, fontWeight: "500", marginTop: 4, opacity: 0.7 },
  mapWidget: {
    paddingVertical: 18,
  },
  mapWidgetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  mapIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mapWidgetCopy: {
    flex: 1,
  },
  mapWidgetSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  signOutButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  widget: {
    borderRadius: 32,
    borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
    padding: 24,
  },
  widgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  widgetTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
  editLabel: { fontSize: 11, fontWeight: "800", color: COLORS.brandPrimary },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  statLabel: { fontSize: 10, fontWeight: "800", marginTop: 4 },
  divider: { width: 1, height: 40, opacity: 0.5 },
  medicalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  medicalInfo: { flex: 1, marginLeft: 16 },
  medicalLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  medicalValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
});
