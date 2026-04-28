import React, { useMemo } from 'react';
import { View, Text, ScrollView, Platform, Image } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
  WalletBalanceCard,
  LinkPaymentCard,
  PaymentHistoryList,
} from './PaymentScreenComponents';
import PaymentMethodSelector from './PaymentMethodSelector';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';
import { getStackViewportVariant, getStackViewportVariantGroup } from '../../utils/ui/stackViewportConfig';
import { getStackResponsiveMetrics } from '../../utils/ui/stackResponsiveMetrics';
import { PAYMENT_SIDEBAR_HIG, computeHeaderClearance, getPaymentSidebarGlassTokens } from './paymentSidebarLayout';
import { COLORS } from '../../constants/colors';

// PULLBACK NOTE: Pass 7 finalization — liquid-glass island at MD+
// Sidebar: BlurView + ghostSurface (parity with map sheet), 24pt squircle, header-aligned vertical
//   padding, tighter horizontal padding, justify-between (LinkCard pinned to bottom)
// Right panel: header clearance + gutter rhythm matching sidebar
// Single source of truth for dimensions: layout prop from PaymentStageBase

export default function PaymentManagementVariant({ model, theme, isDarkMode, layout = null, bottomPadding = 90, surfaceConfig = {} }) {
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
        {/* Brand mark — fills dead space above sidebar island, within sidebar column */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: sidebarLeft,
            width: sidebarWidth,
            top: 0,
            height: headerClearance,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: sidebarInnerPaddingHorizontal + 4,
            gap: 8,
          }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: 'column', gap: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: isDarkMode ? '#FFFFFF' : '#0F172A', lineHeight: 20 }}>
              iVisit<Text style={{ color: COLORS.brandPrimary }}>.</Text>
            </Text>
            <Text style={{ fontSize: 8, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', color: COLORS.brandPrimary, opacity: 0.7, lineHeight: 10 }}>
              Emergency Response
            </Text>
          </View>
        </View>

        {/* Left: liquid-glass island — BlurView with ghostSurface, squircle radius, header-aligned inner padding */}
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
            borderCurve: 'continuous',
            overflow: 'hidden',
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'space-between',
              paddingTop: sidebarInnerPadding,
              paddingBottom: sidebarInnerPadding + bottomPadding,
              paddingHorizontal: sidebarInnerPaddingHorizontal,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Top group: Saved methods + cards */}
            <View style={{ gap: metrics?.spacing?.sm || 8 }}>
              <Text style={{ fontSize: metrics?.typography?.body?.fontSize || 14, fontWeight: '600', marginBottom: metrics?.spacing?.xs || 4, color: theme.textMuted }}>
                {PAYMENT_SCREEN_COPY.management.savedMethods}
              </Text>
              <PaymentMethodSelector
                selectedMethod={model.selectedMethod}
                onMethodSelect={model.handleMethodSelect}
                isDarkMode={isDarkMode}
                isManagementMode={model.isManagementMode}
                cost={model.cost}
                showAddButton={false}
                refreshTrigger={model.paymentRefreshCount}
              />
            </View>

            {/* Bottom: Link CTA pinned to bottom of left panel */}
            <View style={{ marginTop: gap }}>
              <LinkPaymentCard
                onPress={() => model.setShowAddModal(true)}
                isDarkMode={isDarkMode}
              />
            </View>
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
            maxWidth: 640,
            width: '100%',
            alignSelf: 'flex-start',
          }}
          showsVerticalScrollIndicator={false}
        >
          <WalletBalanceCard
            walletBalance={model.walletBalance}
            onTopUp={model.handleTopUp}
            isSaving={model.isSaving}
            isDarkMode={isDarkMode}
          />

          <PaymentHistoryList
            paymentHistory={model.paymentHistory}
            onTransactionPress={model.setSelectedTransaction}
            refreshing={model.refreshing}
            loading={model.isLoadingWallet}
            onRefresh={model.refreshPaymentHistory}
            onSeeMore={() => model.setShowHistoryModal(true)}
            isDarkMode={isDarkMode}
          />
        </ScrollView>
      </>
    );
  }

  return (
    <View style={{ gap }}>
      <WalletBalanceCard
        walletBalance={model.walletBalance}
        onTopUp={model.handleTopUp}
        isSaving={model.isSaving}
        isDarkMode={isDarkMode}
      />

      <LinkPaymentCard
        onPress={() => model.setShowAddModal(true)}
        isDarkMode={isDarkMode}
      />

      <View style={{ borderRadius: metrics?.radii?.lg || 20, borderCurve: 'continuous', padding: metrics?.spacing?.lg || 16, backgroundColor: theme.card }}>
        <Text style={{ fontSize: metrics?.typography?.body?.fontSize || 14, fontWeight: '400', marginBottom: metrics?.spacing?.md || 12, color: theme.text }}>
          {PAYMENT_SCREEN_COPY.management.savedMethods}
        </Text>
        <PaymentMethodSelector
          selectedMethod={model.selectedMethod}
          onMethodSelect={model.handleMethodSelect}
          isDarkMode={isDarkMode}
          isManagementMode={model.isManagementMode}
          cost={model.cost}
          showAddButton={false}
          refreshTrigger={model.paymentRefreshCount}
        />
      </View>

      <PaymentHistoryList
        paymentHistory={model.paymentHistory}
        onTransactionPress={model.setSelectedTransaction}
        refreshing={model.refreshing}
        loading={model.isLoadingWallet}
        onRefresh={model.refreshPaymentHistory}
        onSeeMore={() => model.setShowHistoryModal(true)}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}
