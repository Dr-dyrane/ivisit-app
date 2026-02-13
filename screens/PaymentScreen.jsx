"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useHeaderState } from '../contexts/HeaderStateContext';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../constants/colors';
import { STACK_TOP_PADDING } from '../constants/layout';
import { paymentService } from '../services/paymentService';
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';
import HeaderBackButton from '../components/navigation/HeaderBackButton';

const { width } = Dimensions.get('window');

const PaymentScreen = () => {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setHeaderState } = useHeaderState();

  // Mode Detection: If no amount or requestId is passed, we are in 'Management' mode
  const isManagementMode = !params.amount && !params.requestId && !params.serviceType;

  const emergencyRequestId = params.requestId;
  const serviceType = params.serviceType || 'ambulance';
  const initialAmount = parseFloat(params.amount) || 0;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [insuranceApplied, setInsuranceApplied] = useState(false);
  const [cost, setCost] = useState({
    totalCost: initialAmount,
    breakdown: initialAmount > 0 ? [{ name: 'Base Service', cost: initialAmount, type: 'base' }] : []
  });

  const [walletBalance, setWalletBalance] = useState({ balance: 0, currency: 'USD' });
  const [ledgerHistory, setLedgerHistory] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();

    if (!isManagementMode) {
      loadCostAndInsurance();
    } else {
      loadWalletData();
    }
  }, [isManagementMode]);

  const loadWalletData = async () => {
    setIsLoadingWallet(true);
    try {
      const [balance, ledger] = await Promise.all([
        paymentService.getWalletBalance(),
        paymentService.getWalletLedger()
      ]);
      setWalletBalance(balance);
      setLedgerHistory(ledger);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const loadCostAndInsurance = async () => {
    try {
      const tripCost = await paymentService.calculateTripCost(serviceType, {
        distance: parseFloat(params.distance) || 0,
        isUrgent: params.isUrgent === 'true'
      });

      const { data: { user } } = await paymentService.supabase.auth.getUser();
      if (user) {
        const insuranceResult = await paymentService.applyInsuranceCoverage(user.id, tripCost);
        if (insuranceResult.hasInsurance) {
          setCost(insuranceResult.adjustedCost);
          setInsuranceApplied(true);
        } else {
          setCost(tripCost);
        }
      } else {
        setCost(tripCost);
      }
    } catch (error) {
      console.error('Error loading cost:', error);
    }
  };

  const backButton = useCallback(() => <HeaderBackButton />, []);

  useFocusEffect(
    useCallback(() => {
      setHeaderState({
        title: isManagementMode ? "Wallet" : "Payment",
        subtitle: isManagementMode ? "PAYMENTS & BILLING" : "SECURE CHECKOUT",
        icon: <Ionicons name={isManagementMode ? "wallet" : "card"} size={26} color="#FFFFFF" />,
        backgroundColor: COLORS.brandPrimary,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false,
      });
    }, [setHeaderState, backButton, isManagementMode])
  );

  const handlePayment = async () => {
    if (!selectedMethod) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Selection Required', 'Please choose a payment method to continue.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Simulate direct Stripe integration flow
      // Actually calling the service which uses Supabase Edge Functions
      const result = await paymentService.processPayment(
        emergencyRequestId,
        params.organizationId || 'default', // Organization ID
        cost
      );

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show completion beat as per Alexander UI canon
        Alert.alert(
          'Payment Successful',
          'Your request has been processed securely. Track your service real-time.',
          [
            {
              text: 'Track Now',
              onPress: () => router.push(`/emergency/${emergencyRequestId || 'last'}`)
            }
          ]
        );
      } else {
        throw new Error("Unable to confirm payment");
      }
    } catch (error) {
      console.error('Payment failure:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try another card.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTopUp = async () => {
    // Show quick top-up options
    Alert.alert(
      "Wallet Top-up",
      "Select an amount to add to your iVisit Balance.",
      [
        { text: "$50", onPress: () => processTopUp(50) },
        { text: "$100", onPress: () => processTopUp(100) },
        { text: "$250", onPress: () => processTopUp(250) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const processTopUp = async (amount) => {
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await paymentService.topUpWallet(amount);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadWalletData(); // Refresh UI
        Alert.alert("Success", `Added $${amount} to your wallet. Your new balance is $${result.newBalance.toFixed(2)}`);
      }
    } catch (error) {
      console.error("Top-up error:", error);
      Alert.alert("Top-up Failed", "Could not process top-up. Please check your card.");
    } finally {
      setIsSaving(false);
    }
  };

  const colors = useMemo(() => ({
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    card: isDarkMode ? "#121826" : "#FFFFFF",
    inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
    background: isDarkMode ? ["#0B0F1A", "#121826", "#0B0F1A"] : ["#FFFFFF", "#F3E7E7", "#FFFFFF"]
  }), [isDarkMode]);

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: STACK_TOP_PADDING }]}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Wallet Dashboard Section - Visible ONLY in Management Mode */}
        {isManagementMode && (
          <View style={styles.walletDashboard}>
            <LinearGradient
              colors={[COLORS.brandPrimary, '#64100E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceHeader}>
                <View>
                  <Text style={styles.walletLabel}>IVISIT BALANCE</Text>
                  <Text style={styles.balanceValue}>
                    ${walletBalance.balance.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>{walletBalance.currency}</Text>
                </View>
              </View>

              <View style={styles.walletActions}>
                <Pressable
                  onPress={handleTopUp}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.topUpButton,
                    { opacity: (pressed || isSaving) ? 0.8 : 1 }
                  ]}
                >
                  <Ionicons name="add-circle" size={20} color={COLORS.brandPrimary} />
                  <Text style={styles.topUpText}>Quick Top-Up</Text>
                </Pressable>
                <View style={styles.securityBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.secureText}>PCI Secure</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Recent Activity */}
            <View style={styles.activityContainer}>
              <View style={styles.activityHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                <Pressable onPress={loadWalletData}>
                  <Text style={styles.viewAllText}>Refresh</Text>
                </Pressable>
              </View>

              {ledgerHistory.length > 0 ? (
                <View style={[styles.ledgerList, { backgroundColor: colors.card }]}>
                  {ledgerHistory.map((item, index) => (
                    <View key={item.id} style={[
                      styles.ledgerItem,
                      index !== ledgerHistory.length - 1 && styles.ledgerDivider
                    ]}>
                      <View style={[
                        styles.typeIcon,
                        { backgroundColor: item.transaction_type === 'credit' ? '#22C55E20' : '#EF444420' }
                      ]}>
                        <Ionicons
                          name={item.transaction_type === 'credit' ? "arrow-down" : "arrow-up"}
                          size={16}
                          color={item.transaction_type === 'credit' ? '#22C55E' : '#EF4444'}
                        />
                      </View>
                      <View style={styles.ledgerMeta}>
                        <Text style={[styles.ledgerDesc, { color: colors.text }]}>{item.description}</Text>
                        <Text style={[styles.ledgerDate, { color: colors.textMuted }]}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.ledgerAmount,
                        { color: item.transaction_type === 'credit' ? '#22C55E' : colors.text }
                      ]}>
                        {item.transaction_type === 'credit' ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyLedger, { backgroundColor: colors.card }]}>
                  <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent transactions</Text>
                </View>
              )}
            </View>
          </View>
        )}
        {/* Payment Identity Section - Hidden in Management Mode */}
        {!isManagementMode && (
          <View style={[styles.glowCard, { backgroundColor: colors.card }]}>
            <View style={styles.amountDisplay}>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>TOTAL AMOUNT</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>${cost.totalCost.toFixed(2)}</Text>
            </View>

            {insuranceApplied && (
              <View style={styles.insuranceBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.brandPrimary} />
                <Text style={styles.insuranceBadgeText}>Insurance Covered</Text>
              </View>
            )}

            <View style={styles.serviceAssurance}>
              <Ionicons name="checkmark-circle" size={12} color={colors.textMuted} />
              <Text style={[styles.serviceText, { color: colors.textMuted }]}>
                Secure Payment & Quality Guarantee
              </Text>
            </View>
          </View>
        )}

        {/* Payment Summary Section - Hidden in Management Mode */}
        {!isManagementMode && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Summary</Text>
            {cost.breakdown.map((item, idx) => (
              <View key={idx} style={styles.row}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.name}</Text>
                  {item.type === 'fee' && (
                    <Text style={styles.subLabel}>Processing & Platform Fee</Text>
                  )}
                </View>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  ${item.cost.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total to Pay</Text>
              <Text style={[styles.totalValue, { color: COLORS.brandPrimary }]}>${cost.totalCost.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Payment Method Selector */}
        <View style={styles.paymentSelectorContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, marginBottom: 12 }]}>
            {isManagementMode ? "Default Funding Account" : "Payment Method"}
          </Text>
          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            onMethodSelect={(m) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedMethod(m);
            }}
            isDarkMode={isDarkMode}
          />
        </View>

        {/* Action Button - Hidden in Management Mode or modified */}
        {!isManagementMode && (
          <View style={styles.footer}>
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed" size={14} color={COLORS.brandPrimary} />
              <Text style={[styles.securityText, { color: colors.textMuted }]}>
                PCI-DSS Compliant Secure Payment
              </Text>
            </View>

            <Pressable
              onPress={handlePayment}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.payButton,
                {
                  backgroundColor: selectedMethod ? COLORS.brandPrimary : (isDarkMode ? '#1E293B' : '#E2E8F0'),
                  opacity: pressed ? 0.9 : 1
                }
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.payButtonText}>Confirm Payment</Text>
                  <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>
        )}
      </Animated.ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
    paddingBottom: 100,
  },
  glowCard: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  walletDashboard: {
    gap: 24,
  },
  balanceCard: {
    borderRadius: 32,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4,
  },
  currencyBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
  },
  topUpText: {
    color: COLORS.brandPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityContainer: {
    gap: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  viewAllText: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  ledgerList: {
    borderRadius: 28,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  ledgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  ledgerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerMeta: {
    flex: 1,
  },
  ledgerDesc: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  ledgerDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyLedger: {
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountDisplay: {
    alignItems: 'center',
    gap: 8,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  insuranceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandPrimary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.brandPrimary + '30',
  },
  insuranceBadgeText: {
    color: COLORS.brandPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    borderRadius: 28,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  itemInfo: {
    flex: 1,
  },
  subLabel: {
    fontSize: 10,
    color: COLORS.brandPrimary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  serviceAssurance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
    opacity: 0.8,
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '900',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  paymentSelectorContainer: {
    marginTop: 8,
  },
  footer: {
    marginTop: 12,
    gap: 20,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  }
});

export default PaymentScreen;
