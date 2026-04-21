/**
 * Payment Method Selector Component
 * Uber-like payment method selection interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { paymentService, PAYMENT_METHODS } from '../../services/paymentService';
import { database, StorageKeys } from '../../database';
import AddPaymentMethodModal from './AddPaymentMethodModal';

const PaymentMethodSelector = ({
  selectedMethod,
  onMethodSelect,
  cost,
  hospitalId = null,
  organizationId = null,
  simulatePayments = false,
  preferCashFirst = false,
  demoCashOnly = false,
  showAddButton = true,
  isManagementMode = false,
  refreshTrigger,
  style
}) => {
  const { isDarkMode } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [isCashEligible, setIsCashEligible] = useState(true);
  const [checkingCash, setCheckingCash] = useState(false);

  const colors = React.useMemo(() => ({
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    muted: isDarkMode ? "#94A3B8" : "#64748B",
    cardBg: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    activeRing: COLORS.brandPrimary,
  }), [isDarkMode]);

  useEffect(() => {
    loadPaymentMethods();
  }, [refreshTrigger, hospitalId, cost?.totalCost, simulatePayments, preferCashFirst, demoCashOnly]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const [methods, wallet, cachedDefault] = await Promise.all([
        paymentService.getPaymentMethods(),
        paymentService.getWalletBalance(),
        database.read(StorageKeys.DEFAULT_PAYMENT_METHOD)
      ]);

      // Add iVisit Wallet as a selectable method if it has balance or is active
      const walletMethod = {
        id: 'wallet_internal',
        type: 'wallet',
        brand: 'iVisit Balance',
        last4: wallet.balance.toFixed(2),
        is_wallet: true,
        balance: wallet.balance,
        currency: wallet.currency,
        is_default: false
      };

      const cashMethod = {
        id: 'cash_payment',
        type: 'cash',
        brand: 'Cash',
        last4: 'Payment',
        is_cash: true,
        is_default: false
      };

      // Check Cash Eligibility if we have a hospital context
      if (simulatePayments) {
        setIsCashEligible(true);
        setCheckingCash(false);
      } else if (hospitalId && cost?.totalCost > 0) {
        setCheckingCash(true);
        try {
          const checkId = organizationId || hospitalId;
          const eligible = await paymentService.checkCashEligibility(checkId, cost.totalCost);
          setIsCashEligible(eligible);
        } catch (e) {
          setIsCashEligible(false);
        } finally {
          setCheckingCash(false);
        }
      }

      const finalMethods = preferCashFirst
        ? [cashMethod, walletMethod, ...methods]
        : [walletMethod, cashMethod, ...methods];
      setPaymentMethods(finalMethods);

      if (finalMethods.length > 0) {
        // Priority for selection:
        // 1. Currently selected (if any)
        // 2. Cached default (persisted choice)
        // 3. Wallet (if enough balance)
        // 4. Default card in DB
        // 5. First available

        const cachedMatch = cachedDefault ? finalMethods.find(m => m.id === cachedDefault.id) : null;
        const enoughBalance = wallet.balance >= (cost?.totalCost || 0);
        const dbDefault = finalMethods.find(m => m.is_default);

        const selectedMatch = selectedMethod
          ? finalMethods.find(m => m.id === selectedMethod.id)
          : null;

        const defaultMethod =
          (demoCashOnly && simulatePayments ? cashMethod : null) ||
          selectedMatch || // Keep current if valid
          cachedMatch || // Respect user's explicit choice
          (preferCashFirst ? cashMethod : null) ||
          (enoughBalance ? walletMethod : dbDefault) || // Automation
          finalMethods[0];

        if (defaultMethod && (!selectedMethod || selectedMethod.id !== defaultMethod.id)) {
          onMethodSelect(defaultMethod);
        }
      }
    } catch (error) {
      console.error('Error loading methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (paymentMethod) => {
    try {
      setAddingMethod(true);
      const newMethod = await paymentService.addPaymentMethod(paymentMethod);
      setPaymentMethods(prev => [newMethod, ...prev]);
      setShowAddModal(false);
      onMethodSelect(newMethod);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('System Error', error.message);
    } finally {
      setAddingMethod(false);
    }
  };

  const handleSetDefault = async (method) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await paymentService.setDefaultPaymentMethod(method.id);
      loadPaymentMethods();
      Alert.alert("Success", "Default payment method updated");
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteMethod = async (method) => {
    Alert.alert(
      "Remove Card",
      `Are you sure you want to remove ${method.brand} ending in ${method.last4}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await paymentService.removePaymentMethod(method.id);
              loadPaymentMethods();
              if (selectedMethod?.id === method.id) {
                onMethodSelect(null);
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const renderPaymentMethod = (method) => {
    const isSelected = selectedMethod?.id === method.id;
    const isDefault = method.is_default;
    const isDemoLocked = simulatePayments && demoCashOnly && !method.is_cash;
    const unavailableCopy = 'NOT AVAILABLE FOR THIS REQUEST';
    const walletCheckoutCopy = 'BALANCE CHECKOUT';
    const cardCheckoutCopy = 'CARD CHECKOUT';
    const cashReadyCopy = 'PROVIDER CONFIRMATION';
    const isUnavailable =
      isDemoLocked ||
      (!simulatePayments &&
        ((method.is_wallet && !isManagementMode && method.balance < (cost?.totalCost || 0)) ||
          (method.is_cash && !isCashEligible && !isManagementMode)));
    const methodSubtitle = method.is_wallet
      ? (simulatePayments
          ? (demoCashOnly ? unavailableCopy : walletCheckoutCopy)
          : (method.balance < (cost?.totalCost || 0) && !isManagementMode
              ? 'INSUFFICIENT BALANCE'
              : `AVAILABLE: ${method.currency} ${method.last4}`))
      : method.is_cash
        ? (simulatePayments
            ? cashReadyCopy
            : (isCashEligible ? 'PAY ON ARRIVAL' : (checkingCash ? 'VERIFYING...' : 'UNAVAILABLE (LOW COLLATERAL)')))
        : (simulatePayments
            ? (demoCashOnly ? unavailableCopy : cardCheckoutCopy)
            : `EXPIRES ${method.expiry_month}/${method.expiry_year}`);

    return (
      <View key={method.id} style={styles.methodWrapper}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onMethodSelect(method);
            if (isManagementMode) {
              handleSetDefault(method);
            }
          }}
          style={[
            styles.methodCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: isSelected ? colors.activeRing : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              opacity: isUnavailable ? 0.6 : 1
            }
          ]}
          disabled={isUnavailable}
        >
          <View style={styles.methodMain}>
            <View style={[styles.iconBox, { backgroundColor: isSelected ? colors.activeRing : 'rgba(255,255,255,0.05)' }]}>
              <Ionicons
                name={method.is_wallet ? "wallet" : (method.is_cash ? "cash-outline" : (method.brand?.toLowerCase() === 'visa' ? "card" : "card-outline"))}
                size={20}
                color={isSelected ? "#FFF" : colors.text}
              />
            </View>
            <View style={styles.methodMeta}>
              <View style={styles.labelRow}>
                <Text style={[styles.methodLabel, { color: colors.text }]}>
                  {method.brand} {method.is_wallet || method.is_cash ? '' : '•••• ' + method.last4}
                </Text>
                {isDefault && !method.is_wallet && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.methodSub, { color: isUnavailable ? COLORS.error : colors.muted }]}>
                {methodSubtitle}
              </Text>
            </View>
          </View>

          {isManagementMode && !method.is_wallet && !method.is_cash ? (
            <TouchableOpacity
              onPress={() => handleDeleteMethod(method)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color={isDarkMode ? "#FF4B4B" : "#FF0000"} />
            </TouchableOpacity>
          ) : (
            isSelected && (
              <Ionicons name="checkmark-circle" size={22} color={COLORS.brandPrimary} />
            )
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingList}>
          {[0, 1, 2].map((index) => (
            <View
              key={`payment-method-skeleton-${index}`}
              style={[styles.methodSkeletonCard, { backgroundColor: colors.cardBg }]}
            >
              <View
                style={[
                  styles.methodSkeletonIcon,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(15,23,42,0.08)',
                  },
                ]}
              />
              <View style={styles.methodSkeletonCopy}>
                <View
                  style={[
                    styles.methodSkeletonLine,
                    {
                      width: index === 0 ? '58%' : '44%',
                      backgroundColor: isDarkMode
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(15,23,42,0.10)',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.methodSkeletonLineSmall,
                    {
                      width: index === 1 ? '52%' : '38%',
                      backgroundColor: isDarkMode
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(15,23,42,0.06)',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        style={styles.methodsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {paymentMethods.map(renderPaymentMethod)}

        {showAddButton && !(simulatePayments && demoCashOnly) && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.addCard, { borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddModal(true);
            }}
          >
            <View style={styles.addCardContent}>
              <Ionicons name="add-circle" size={24} color={COLORS.brandPrimary} />
              <Text style={styles.addCardText}>ADD PAYMENT METHOD</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <AddPaymentMethodModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPaymentMethod}
          loading={addingMethod}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
  loadingList: {
    gap: 12,
  },
  methodSkeletonCard: {
    minHeight: 80,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodSkeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  methodSkeletonCopy: {
    flex: 1,
    gap: 8,
  },
  methodSkeletonLine: {
    height: 14,
    borderRadius: 999,
  },
  methodSkeletonLineSmall: {
    height: 10,
    borderRadius: 999,
  },
  methodCard: {
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodMeta: {
    gap: 2,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  methodSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  methodWrapper: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultText: {
    color: '#22C55E',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  addCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addCardText: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default PaymentMethodSelector;
