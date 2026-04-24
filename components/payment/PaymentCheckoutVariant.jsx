import React from 'react';
import { View, Text } from 'react-native';
import {
  PaymentIdentitySection,
  PaymentSummarySection,
  PaymentFooter,
} from './PaymentScreenComponents';
import PaymentMethodSelector from './PaymentMethodSelector';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';

// PULLBACK NOTE: Create PaymentCheckoutVariant following map sheets pattern
// OLD: Checkout mode UI mixed in orchestrator
// NEW: Variant file only passes config/theme and renders UI
// REASON: Follow modular architecture pattern - variant files only pass config/theme

export default function PaymentCheckoutVariant({ model, theme, isDarkMode }) {
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

      <View style={{ gap: 8 }}>
        <Text style={[{ fontSize: 16, fontWeight: '700', marginLeft: 8, marginBottom: 12, color: theme.text }]}>
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
