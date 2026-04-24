import React, { useCallback } from 'react';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHeaderState } from '../../contexts/HeaderStateContext';
import { useFocusEffect } from 'expo-router';
import { useFAB } from '../../contexts/FABContext';
import HeaderBackButton from '../navigation/HeaderBackButton';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import MapHistoryPaymentModal from '../map/history/MapHistoryPaymentModal';
import {
  PaymentHistoryModal,
  AddFundsModal,
} from './PaymentScreenComponents';
import { PAYMENT_SCREEN_COPY } from './paymentScreen.content';
import { usePaymentScreenModel } from '../../hooks/payment/usePaymentScreenModel';
import PaymentStageBase from './PaymentStageBase';
import PaymentManagementVariant from './PaymentManagementVariant';
import PaymentCheckoutVariant from './PaymentCheckoutVariant';
import { createPaymentScreenTheme } from './paymentScreen.theme';

// PULLBACK NOTE: Refactor PaymentScreenOrchestrator following modular architecture pattern
// OLD: Orchestrator owned shell, snap, motion, slots, and rendered UI directly
// NEW: Orchestrator only chooses phase/device variant, passes config/theme
// REASON: Follow pattern - orchestrator chooses variant, StageBase owns shell/snap/motion/slots

export default function PaymentScreenOrchestrator() {
  const { isDarkMode } = useTheme();
  const { setHeaderState } = useHeaderState();
  const { registerFAB, unregisterFAB } = useFAB();

  // Use the business logic hook - owns domain state and side effects
  const model = usePaymentScreenModel();

  // Theme config
  const theme = createPaymentScreenTheme({ isDarkMode });

  // Header & Tab Bar Setup
  const backButton = useCallback(() => <HeaderBackButton />, []);

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: model.isManagementMode ? PAYMENT_SCREEN_COPY.management.title : PAYMENT_SCREEN_COPY.checkout.title,
        subtitle: model.isManagementMode ? PAYMENT_SCREEN_COPY.management.subtitle : PAYMENT_SCREEN_COPY.checkout.subtitle,
        icon: model.isManagementMode ? (
          <Ionicons name="wallet" size={26} color={theme.text} />
        ) : (
          <Ionicons name="card" size={26} color={theme.text} />
        ),
        backgroundColor: theme.card,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false,
      });

      // Context-Aware FAB for Linking Card
      if (model.isManagementMode) {
        registerFAB('wallet-add-card', {
          icon: PAYMENT_SCREEN_COPY.fab.icon,
          label: PAYMENT_SCREEN_COPY.fab.label,
          subText: PAYMENT_SCREEN_COPY.fab.subText,
          visible: true,
          onPress: () => model.setShowAddModal(true),
          style: PAYMENT_SCREEN_COPY.fab.style,
          haptic: PAYMENT_SCREEN_COPY.fab.haptic,
          priority: PAYMENT_SCREEN_COPY.fab.priority,
          animation: PAYMENT_SCREEN_COPY.fab.animation,
          allowInStack: PAYMENT_SCREEN_COPY.fab.allowInStack,
        });
      }

      return () => {
        if (model.isManagementMode) {
          unregisterFAB('wallet-add-card');
        }
      };
    // PULLBACK NOTE: Fix infinite loop by removing unstable deps
    // OLD: model and theme in deps (new objects every render) caused infinite loop
    // NEW: only primitives and stable callbacks in deps
    // REASON: Root cause was useFocusEffect re-running every render
    }, [setHeaderState, backButton, model.isManagementMode, isDarkMode, registerFAB, unregisterFAB, model.setShowAddModal])
  );

  // Choose variant based on mode
  const VariantComponent = model.isManagementMode ? PaymentManagementVariant : PaymentCheckoutVariant;

  return (
    <PaymentStageBase isDarkMode={isDarkMode}>
      <VariantComponent model={model} theme={theme} isDarkMode={isDarkMode} />

      {/* Modals - rendered at orchestrator level */}
      <Modal
        visible={model.showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => model.setShowAddModal(false)}
      >
        <AddPaymentMethodModal
          onClose={() => model.setShowAddModal(false)}
          onAdd={model.handleAddPaymentMethod}
          loading={model.isSaving}
        />
      </Modal>

      {/* PULLBACK NOTE: Nest detail modal inside history modal tree for reliable stacking */}
      {/* OLD: Detail modal rendered as sibling — failed to stack above history on iOS/Android */}
      {/* NEW: Detail modal passed as children so it renders within history modal's tree when open, and as sibling fallback when history is closed */}
      {/* REASON: RN Modal siblings do not reliably z-order; nesting is the canonical fix */}
      <PaymentHistoryModal
        visible={model.showHistoryModal}
        paymentHistory={model.paymentHistory}
        onTransactionPress={model.setSelectedTransaction}
        onClose={() => model.setShowHistoryModal(false)}
        isDarkMode={isDarkMode}
      >
        <MapHistoryPaymentModal
          visible={!!model.selectedTransaction}
          paymentRecord={model.selectedTransaction}
          onClose={() => model.setSelectedTransaction(null)}
        />
      </PaymentHistoryModal>

      {/* Sibling fallback — shown when history modal is closed (transaction tapped directly from main list) */}
      {!model.showHistoryModal ? (
        <MapHistoryPaymentModal
          visible={!!model.selectedTransaction}
          paymentRecord={model.selectedTransaction}
          onClose={() => model.setSelectedTransaction(null)}
        />
      ) : null}

      <AddFundsModal
        visible={model.showAddFundsModal}
        onClose={() => model.setShowAddFundsModal(false)}
        onAmountSelect={model.processTopUp}
        isDarkMode={isDarkMode}
        isSaving={model.isSaving}
      />
    </PaymentStageBase>
  );
}
