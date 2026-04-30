import React, { useMemo } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { INSURANCE_SCREEN_COPY } from "./insuranceScreen.content";
import InsuranceActionIsland from "./InsuranceActionIsland";
import InsuranceContextPane from "./InsuranceContextPane";
import InsurancePolicyList from "./InsurancePolicyList";
import {
  computeInsuranceHeaderClearance,
  computeInsuranceThirdColumnLayout,
  getInsuranceSidebarGlassTokens,
  INSURANCE_SIDEBAR_HIG,
} from "./insuranceSidebarLayout";

// PULLBACK NOTE: Insurance wide-screen variant follows the shared stack-shell pattern.
// Left island owns coverage context, center owns the policy artifact list, and XL right island fills spare canvas with focused actions.

export default function InsuranceWideLayout({
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
  const { width } = useWindowDimensions();
  const glass = useMemo(
    () => getInsuranceSidebarGlassTokens({ isDarkMode }),
    [isDarkMode],
  );
  const headerClearance = useMemo(
    () =>
      computeInsuranceHeaderClearance({
        surfaceConfig,
        insetsTop: insets.top,
      }),
    [insets.top, surfaceConfig],
  );
  const thirdColumnLayout = useMemo(
    () =>
      computeInsuranceThirdColumnLayout({
        layout,
        viewportVariant,
        width,
      }),
    [layout, viewportVariant, width],
  );
  const showThirdColumn = thirdColumnLayout.usesThirdColumn === true;
  const centerPanelMaxWidth = showThirdColumn ? 800 : 720;

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
            {INSURANCE_SCREEN_COPY.screen.title}
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
          borderRadius: INSURANCE_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
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
          <InsuranceContextPane
            theme={theme}
            metrics={metrics}
            coverageCountLabel={model.coverageCountLabel}
            defaultPolicyLabel={model.defaultPolicyLabel}
            lastUpdatedLabel={model.lastUpdatedLabel}
            syncNotice={model.syncNotice}
            onAddCoverage={model.openCreate}
            loading={loading}
          />
        </ScrollView>
      </BlurView>

      <ScrollView
        style={{
          flex: 1,
          minWidth: 0,
          marginRight: showThirdColumn
            ? thirdColumnLayout.centerPanelMarginRight
            : 0,
        }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: headerClearance,
          paddingBottom: bottomPadding,
          paddingLeft: layout.rightPanelLeftPadding,
          paddingRight: layout.rightPanelRightPadding,
          minWidth: 0,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(model.isRefreshing)}
            onRefresh={() => {
              void model.refresh();
            }}
            tintColor={isDarkMode ? "#FFFFFF" : COLORS.brandPrimary}
          />
        }
      >
        <View
          style={{
            width: "100%",
            maxWidth: centerPanelMaxWidth,
            minWidth: 0,
            alignSelf: "flex-start",
            gap: metrics.spacing.lg,
          }}
        >
          <View style={{ gap: metrics.spacing.xs, width: "100%" }}>
            <Text
              style={{
                color: theme.text,
                fontSize: Math.max(metrics.typography.title.fontSize + 4, 24),
                lineHeight: Math.max(
                  metrics.typography.title.lineHeight + 6,
                  30,
                ),
                fontWeight: "700",
                letterSpacing: -0.35,
              }}
            >
              {INSURANCE_SCREEN_COPY.center.title}
            </Text>
          </View>

          <InsurancePolicyList
            policies={model.policies}
            isDarkMode={isDarkMode}
            theme={theme}
            metrics={metrics}
            loading={loading}
            onAddCoverage={model.openCreate}
            onEditPolicy={model.editPolicy}
            onDeletePolicy={model.deletePolicy}
            onSetDefaultPolicy={model.setDefaultPolicy}
            onLinkPayment={model.linkPayment}
            contentPaddingHorizontal={0}
          />
        </View>
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
            borderRadius: INSURANCE_SIDEBAR_HIG.SIDEBAR_CORNER_RADIUS,
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
            <InsuranceActionIsland
              theme={theme}
              metrics={metrics}
              coverageCountLabel={model.coverageCountLabel}
              defaultPolicyLabel={model.defaultPolicyLabel}
              linkedPaymentLabel={model.linkedPaymentLabel}
              imageStatusLabel={model.imageStatusLabel}
              syncNotice={model.syncNotice}
              onAddCoverage={model.openCreate}
              loading={loading}
            />
          </ScrollView>
        </BlurView>
      ) : null}
    </>
  );
}
