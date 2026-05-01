import React, { useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { SETTINGS_SCREEN_COPY } from "./settingsScreen.content";
import SettingsActionIsland from "./SettingsActionIsland";
import SettingsContextPane from "./SettingsContextPane";
import SettingsSectionList from "./SettingsSectionList";
import {
  computeSettingsHeaderClearance,
  computeSettingsThirdColumnLayout,
  getSettingsSidebarGlassTokens,
  SETTINGS_SIDEBAR_HIG,
} from "./settingsSidebarLayout";

// PULLBACK NOTE: Settings wide-screen variant follows the shared stack-shell pattern.
// Left island owns context, center owns the grouped preferences list, and XL right island fills spare canvas with quick actions.

export default function SettingsWideLayout({
  isDarkMode,
  theme,
  metrics,
  layout,
  surfaceConfig,
  viewportVariant,
  bottomPadding,
  model,
  loading = false,
}) {
  const insets = useSafeAreaInsets();
  const glass = useMemo(
    () => getSettingsSidebarGlassTokens({ isDarkMode }),
    [isDarkMode],
  );
  const headerClearance = useMemo(
    () =>
      computeSettingsHeaderClearance({
        surfaceConfig,
        insetsTop: insets.top,
      }),
    [insets.top, surfaceConfig],
  );
  const thirdColumnLayout = useMemo(
    () =>
      computeSettingsThirdColumnLayout({
        layout,
        viewportVariant,
      }),
    [layout, viewportVariant],
  );
  const showThirdColumn = thirdColumnLayout.usesThirdColumn === true;
  const centerPanelMaxWidth = showThirdColumn ? 760 : 720;

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: layout.sidebarLeft,
          width: layout.sidebarWidth,
          top: 0,
          height: headerClearance,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: layout.sidebarInnerPaddingHorizontal + 4,
          gap: 8,
        }}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <View style={{ flexDirection: "column", gap: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: -0.3,
              color: isDarkMode ? "#FFFFFF" : "#0F172A",
              lineHeight: 20,
            }}
          >
            iVisit<Text style={{ color: COLORS.brandPrimary }}>.</Text>
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.3,
              color: COLORS.brandPrimary,
              opacity: 0.72,
              lineHeight: 12,
            }}
          >
            {SETTINGS_SCREEN_COPY.screen.title}
          </Text>
        </View>
      </View>

      <BlurView
        intensity={glass.blurIntensity}
        tint={glass.tint}
        style={{
          width: layout.sidebarWidth,
          maxWidth: layout.sidebarWidth,
          flexShrink: 0,
          marginLeft: layout.sidebarLeft,
          marginRight: layout.sidebarGutter,
          marginTop: headerClearance,
          marginBottom: layout.sidebarGutter,
          backgroundColor: glass.ghostSurface,
          borderRadius: SETTINGS_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            gap: metrics.spacing.xl,
            paddingTop: layout.sidebarInnerPadding,
            paddingBottom: layout.sidebarInnerPadding + bottomPadding,
            paddingHorizontal: layout.sidebarInnerPaddingHorizontal,
          }}
          showsVerticalScrollIndicator={false}
        >
          <SettingsContextPane
            theme={theme}
            metrics={metrics}
            isDarkMode={isDarkMode}
            signedInAs={model.signedInAs}
            themeSummary={model.themeSummary}
            notificationsSummary={model.notificationsSummary}
            privacySummary={model.privacySummary}
            loading={loading}
          />
        </ScrollView>
      </BlurView>

      <ScrollView
        style={{
          flex: 1,
          marginRight: showThirdColumn
            ? thirdColumnLayout.centerPanelMarginRight
            : 0,
        }}
        contentContainerStyle={{
          gap: metrics.spacing.lg,
          paddingTop: headerClearance,
          paddingBottom: bottomPadding,
          paddingLeft: layout.rightPanelLeftPadding,
          paddingRight: layout.rightPanelRightPadding,
          maxWidth: centerPanelMaxWidth,
          width: "100%",
          alignSelf: "flex-start",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: metrics.spacing.xs }}>
          <Text
            style={{
              color: theme.text,
              fontSize: Math.max(metrics.typography.title.fontSize + 4, 24),
              lineHeight: Math.max(metrics.typography.title.lineHeight + 6, 30),
              fontWeight: "700",
              letterSpacing: -0.35,
            }}
          >
            {SETTINGS_SCREEN_COPY.center.title}
          </Text>
        </View>

        <SettingsSectionList
          sections={model.sections}
          isDarkMode={isDarkMode}
          contentPaddingHorizontal={0}
          loading={loading}
        />
      </ScrollView>

      {showThirdColumn ? (
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.tint}
          style={{
            position: "absolute",
            right: thirdColumnLayout.thirdIslandRight,
            top: headerClearance,
            bottom: layout.sidebarGutter,
            width: thirdColumnLayout.thirdIslandWidth,
            backgroundColor: glass.ghostSurface,
            borderRadius: SETTINGS_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              gap: metrics.spacing.lg,
              paddingTop: layout.sidebarInnerPadding,
              paddingBottom: layout.sidebarInnerPadding + bottomPadding,
              paddingHorizontal: layout.sidebarInnerPaddingHorizontal,
            }}
            showsVerticalScrollIndicator={false}
          >
            <SettingsActionIsland
              isDarkMode={isDarkMode}
              paymentsSummary={model.paymentsSummary}
              supportSummary={model.supportSummary}
              onPaymentsPress={model.openPayments}
              onHelpPress={model.openHelpCenter}
              onContactSupportPress={model.openContactSupport}
              onSignOutPress={model.signOut}
              loading={loading}
            />
          </ScrollView>
        </BlurView>
      ) : null}
    </>
  );
}
