import React, { useMemo } from "react";
import { View, Text, ScrollView, Platform, Image } from "react-native";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PaymentIdentitySection,
  PaymentSummarySection,
  ServiceReceiptCard,
  PaymentFooter,
  PaymentContextIsland,
} from "./PaymentScreenComponents";
import PaymentMethodSelector from "./PaymentMethodSelector";
import { PAYMENT_SCREEN_COPY } from "./paymentScreen.content";
import {
  getStackViewportVariant,
  getStackViewportVariantGroup,
  isDesktopStackVariant,
} from "../../utils/ui/stackViewportConfig";
import { getStackResponsiveMetrics } from "../../utils/ui/stackResponsiveMetrics";
import { BlurView } from "expo-blur";
import {
  PAYMENT_SIDEBAR_HIG,
  computeHeaderClearance,
  getPaymentSidebarGlassTokens,
  computeThirdColumnLayout,
} from "./paymentSidebarLayout";
import { COLORS } from "../../constants/colors";

// PULLBACK NOTE: Pass 7 finalization — HIG island layout at MD+ (mirrors Management variant)
// Left island: PaymentIdentitySection + PaymentSummarySection
// Right panel: PaymentMethodSelector + PaymentFooter (under floating header)

export default function PaymentCheckoutVariant({
  model,
  theme,
  isDarkMode,
  layout = null,
  bottomPadding = 90,
  surfaceConfig = {},
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Viewport config — resolve variant and responsive metrics
  const viewportVariant = useMemo(
    () => getStackViewportVariant({ platform: Platform.OS, width }),
    [width],
  );
  const variantGroup = useMemo(
    () => getStackViewportVariantGroup(viewportVariant),
    [viewportVariant],
  );
  const metrics = useMemo(
    () => getStackResponsiveMetrics(variantGroup || "compact"),
    [variantGroup],
  );

  const gap = metrics?.spacing?.lg || 20;
  const usesSidebarLayout = Boolean(layout?.usesSidebarLayout);
  const headerClearance = useMemo(
    () => computeHeaderClearance({ surfaceConfig, insetsTop: insets.top }),
    [surfaceConfig, insets.top],
  );

  if (usesSidebarLayout) {
    const {
      sidebarWidth,
      sidebarLeft,
      sidebarGutter,
      sidebarInnerPadding,
      sidebarInnerPaddingHorizontal,
      rightPanelLeftPadding,
      rightPanelRightPadding,
    } = layout;
    const { SIDEBAR_CORNER_RADIUS } = PAYMENT_SIDEBAR_HIG;
    const glass = getPaymentSidebarGlassTokens({ isDarkMode });
    const isDesktop = isDesktopStackVariant(viewportVariant);
    const centerPanelMaxWidth = isDesktop ? 800 : 640;
    const {
      usesThirdColumn,
      thirdIslandWidth,
      thirdIslandRight,
      centerPanelMarginRight,
    } = computeThirdColumnLayout({ layout, viewportVariant });

    return (
      <>
        {/* Brand mark — fills dead space above sidebar island, within sidebar column */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: sidebarLeft,
            width: sidebarWidth,
            top: 0,
            height: headerClearance,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: sidebarInnerPaddingHorizontal + 4,
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
                fontWeight: "900",
                letterSpacing: -0.5,
                color: isDarkMode ? "#FFFFFF" : "#0F172A",
                lineHeight: 20,
              }}
            >
              iVisit<Text style={{ color: COLORS.brandPrimary }}>.</Text>
            </Text>
            <Text
              style={{
                fontSize: 8,
                fontWeight: "900",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: COLORS.brandPrimary,
                opacity: 0.7,
                lineHeight: 10,
              }}
            >
              {PAYMENT_SCREEN_COPY.checkout.title}
            </Text>
          </View>
        </View>

        {/* Left: liquid-glass island — aligned top to headerClearance baseline */}
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.tint}
          style={{
            width: sidebarWidth,
            maxWidth: sidebarWidth,
            flexShrink: 0,
            marginLeft: sidebarLeft,
            marginRight: sidebarGutter,
            marginTop: headerClearance,
            marginBottom: sidebarGutter,
            backgroundColor: glass.ghostSurface,
            borderRadius: SIDEBAR_CORNER_RADIUS,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: sidebarInnerPadding,
              paddingBottom: sidebarInnerPadding + bottomPadding,
              paddingHorizontal: sidebarInnerPaddingHorizontal,
            }}
            showsVerticalScrollIndicator={false}
          >
            <ServiceReceiptCard
              cost={model.cost}
              insuranceApplied={model.insuranceApplied}
              isDarkMode={isDarkMode}
            />
          </ScrollView>
        </BlurView>

        {/* Right: flex:1 column — scrollable content + sticky footer */}
        <View
          style={{
            flex: 1,
            flexDirection: "column",
            marginRight: usesThirdColumn ? centerPanelMarginRight : 0,
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              gap,
              paddingTop: headerClearance,
              paddingBottom: gap,
              paddingLeft: rightPanelLeftPadding,
              paddingRight: rightPanelRightPadding,
              maxWidth: centerPanelMaxWidth,
              width: "100%",
              alignSelf: "flex-start",
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: metrics?.spacing?.sm || 8 }}>
              <Text
                style={{
                  fontSize: metrics?.typography?.body?.fontSize || 14,
                  fontWeight: "600",
                  marginBottom: metrics?.spacing?.xs || 4,
                  color: theme.textMuted,
                }}
              >
                {PAYMENT_SCREEN_COPY.checkout.paymentMethod}
              </Text>
              <PaymentMethodSelector
                selectedMethod={model.selectedMethod}
                onMethodSelect={model.handleMethodSelect}
                isDarkMode={isDarkMode}
                isManagementMode={model.isManagementMode}
                cost={model.cost}
                refreshTrigger={model.paymentRefreshCount}
              />
            </View>
          </ScrollView>

          {/* Sticky footer — pinned outside ScrollView, always visible */}
          <View
            style={{
              paddingHorizontal: rightPanelRightPadding,
              paddingBottom: insets.bottom + sidebarGutter,
              paddingTop: sidebarGutter,
              maxWidth: centerPanelMaxWidth,
              width: "100%",
              alignSelf: "flex-start",
            }}
          >
            <PaymentFooter
              selectedMethod={model.selectedMethod}
              isSaving={model.isSaving}
              onPayment={model.handlePayment}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>

        {/* XL right context island — absolute, mirrors left island geometry */}
        {usesThirdColumn && (
          <BlurView
            intensity={glass.blurIntensity}
            tint={glass.tint}
            style={{
              position: "absolute",
              right: thirdIslandRight,
              top: headerClearance,
              bottom: sidebarGutter,
              width: thirdIslandWidth,
              backgroundColor: glass.ghostSurface,
              borderRadius: SIDEBAR_CORNER_RADIUS,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <PaymentContextIsland
                cost={model.cost}
                insuranceApplied={model.insuranceApplied}
                serviceType={model.serviceType}
                isDarkMode={isDarkMode}
              />
            </ScrollView>
          </BlurView>
        )}
      </>
    );
  }

  return (
    <>
      <PaymentIdentitySection
        cost={model.cost}
        insuranceApplied={model.insuranceApplied}
        isDarkMode={isDarkMode}
      />

      <PaymentSummarySection cost={model.cost} isDarkMode={isDarkMode} />

      <View style={{ gap: metrics?.spacing?.sm || 8 }}>
        <Text
          style={{
            fontSize: metrics?.typography?.body?.fontSize || 14,
            fontWeight: "400",
            marginLeft: metrics?.spacing?.sm || 8,
            marginBottom: metrics?.spacing?.md || 12,
            color: theme.text,
          }}
        >
          {PAYMENT_SCREEN_COPY.checkout.paymentMethod}
        </Text>
        <PaymentMethodSelector
          selectedMethod={model.selectedMethod}
          onMethodSelect={model.handleMethodSelect}
          isDarkMode={isDarkMode}
          isManagementMode={model.isManagementMode}
          cost={model.cost}
          refreshTrigger={model.paymentRefreshCount}
        />
      </View>

      <PaymentFooter
        selectedMethod={model.selectedMethod}
        isSaving={model.isSaving}
        onPayment={model.handlePayment}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
