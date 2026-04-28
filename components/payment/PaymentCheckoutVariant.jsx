import React, { useMemo } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PaymentIdentitySection,
  PaymentSummarySection,
  PaymentFooter,
} from './PaymentScreenComponents';
import PaymentMethodSelector from './PaymentMethodSelector';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';
import { getStackViewportVariant, getStackViewportVariantGroup } from '../../utils/ui/stackViewportConfig';
import { getStackResponsiveMetrics } from '../../utils/ui/stackResponsiveMetrics';
import { BlurView } from 'expo-blur';
import { PAYMENT_SIDEBAR_HIG, computeHeaderClearance, getPaymentSidebarGlassTokens } from './paymentSidebarLayout';

// PULLBACK NOTE: Pass 7 finalization — HIG island layout at MD+ (mirrors Management variant)
// Left island: PaymentIdentitySection + PaymentSummarySection
// Right panel: PaymentMethodSelector + PaymentFooter (under floating header)

export default function PaymentCheckoutVariant({ model, theme, isDarkMode, layout = null, bottomPadding = 90, surfaceConfig = {} }) {
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
    () => getStackResponsiveMetrics(variantGroup || 'compact'),
    [variantGroup],
  );

  const gap = metrics?.spacing?.lg || 20;
  const usesSidebarLayout = Boolean(layout?.usesSidebarLayout);
  const headerClearance = useMemo(
    () => computeHeaderClearance({ surfaceConfig, insetsTop: insets.top }),
    [surfaceConfig, insets.top],
  );

  if (usesSidebarLayout) {
    const { sidebarWidth, sidebarLeft, sidebarGutter, sidebarInnerPadding, sidebarInnerPaddingHorizontal, rightPanelLeftPadding, rightPanelRightPadding } = layout;
    const { SIDEBAR_CORNER_RADIUS } = PAYMENT_SIDEBAR_HIG;
    const glass = getPaymentSidebarGlassTokens({ isDarkMode });

    return (
      <>
        {/* Left: liquid-glass island — Identity + Summary */}
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.tint}
          style={{
            width: sidebarWidth,
            maxWidth: sidebarWidth,
            flexShrink: 0,
            marginLeft: sidebarLeft,
            marginRight: sidebarGutter,
            marginTop: sidebarGutter + insets.top,
            marginBottom: sidebarGutter,
            backgroundColor: glass.ghostSurface,
            borderRadius: SIDEBAR_CORNER_RADIUS,
            borderCurve: 'continuous',
            overflow: 'hidden',
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              gap,
              paddingTop: sidebarInnerPadding,
              paddingBottom: sidebarInnerPadding + bottomPadding,
              paddingHorizontal: sidebarInnerPaddingHorizontal,
            }}
            showsVerticalScrollIndicator={false}
          >
            <PaymentIdentitySection
              cost={model.cost}
              insuranceApplied={model.insuranceApplied}
              isDarkMode={isDarkMode}
            />
            <PaymentSummarySection
              cost={model.cost}
              isDarkMode={isDarkMode}
            />
          </ScrollView>
        </BlurView>

        {/* Right: flex:1 with header clearance and gutter rhythm */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap,
            paddingTop: headerClearance,
            paddingBottom: bottomPadding,
            paddingLeft: rightPanelLeftPadding,
            paddingRight: rightPanelRightPadding,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: metrics?.spacing?.sm || 8 }}>
            <Text style={{ fontSize: metrics?.typography?.body?.fontSize || 14, fontWeight: '600', marginBottom: metrics?.spacing?.xs || 4, color: theme.textMuted }}>
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
        </ScrollView>
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

      <PaymentSummarySection
        cost={model.cost}
        isDarkMode={isDarkMode}
      />

      <View style={{ gap: metrics?.spacing?.sm || 8 }}>
        <Text style={{ fontSize: metrics?.typography?.body?.fontSize || 14, fontWeight: '400', marginLeft: metrics?.spacing?.sm || 8, marginBottom: metrics?.spacing?.md || 12, color: theme.text }}>
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
