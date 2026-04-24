import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import {
  PaymentIdentitySection,
  PaymentSummarySection,
  PaymentFooter,
} from './PaymentScreenComponents';
import PaymentMethodSelector from './PaymentMethodSelector';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';
import { getStackViewportVariant, getStackViewportVariantGroup } from '../../utils/ui/stackViewportConfig';
import { getStackResponsiveMetrics } from '../../utils/ui/stackResponsiveMetrics';

// PULLBACK NOTE: Create PaymentCheckoutVariant following map sheets pattern
// OLD: Checkout mode UI mixed in orchestrator
// NEW: Variant file only passes config/theme and renders UI
// REASON: Follow modular architecture pattern - variant files only pass config/theme

export default function PaymentCheckoutVariant({ model, theme, isDarkMode }) {
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
        <Text style={[{ fontSize: metrics?.typography?.body?.fontSize || 14, fontWeight: metrics?.typography?.body?.fontWeight || '400', marginLeft: metrics?.spacing?.sm || 8, marginBottom: metrics?.spacing?.md || 12, color: theme.text }]}>
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
