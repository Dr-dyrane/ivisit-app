import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import {
  WalletBalanceCard,
  LinkPaymentCard,
  PaymentHistoryList,
} from './PaymentScreenComponents';
import PaymentMethodSelector from './PaymentMethodSelector';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';
import { getStackViewportVariant, getStackViewportVariantGroup } from '../../utils/ui/stackViewportConfig';
import { getStackResponsiveMetrics } from '../../utils/ui/stackResponsiveMetrics';

// PULLBACK NOTE: Create PaymentManagementVariant following map sheets pattern
// OLD: Management mode UI mixed in orchestrator
// NEW: Variant file only passes config/theme and renders UI
// REASON: Follow modular architecture pattern - variant files only pass config/theme

export default function PaymentManagementVariant({ model, theme, isDarkMode }) {
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

  return (
    <View style={{ gap: metrics?.spacing?.lg || 24 }}>
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

      <View style={[{ borderRadius: metrics?.radii?.lg || 20, padding: metrics?.spacing?.lg || 16, backgroundColor: theme.card }]}>
        <Text style={[{ fontSize: metrics?.typography?.body?.fontSize || 14, fontWeight: metrics?.typography?.body?.fontWeight || '400', marginBottom: metrics?.spacing?.md || 12, color: theme.text }]}>
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
