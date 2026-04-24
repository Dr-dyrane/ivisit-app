import React from 'react';
import { View, Text } from 'react-native';
import {
  WalletBalanceCard,
  LinkPaymentCard,
  PaymentHistoryList,
} from './PaymentScreenComponents';
import PaymentMethodSelector from './PaymentMethodSelector';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';

// PULLBACK NOTE: Create PaymentManagementVariant following map sheets pattern
// OLD: Management mode UI mixed in orchestrator
// NEW: Variant file only passes config/theme and renders UI
// REASON: Follow modular architecture pattern - variant files only pass config/theme

export default function PaymentManagementVariant({ model, theme, isDarkMode }) {
  return (
    <View style={{ gap: 24 }}>
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

      <View style={[{ borderRadius: 24, padding: 20, backgroundColor: theme.card }]}>
        <Text style={[{ fontSize: 16, fontWeight: '700', marginBottom: 16, color: theme.text }]}>
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
