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
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useHeaderState } from '../contexts/HeaderStateContext';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollAwareHeader } from '../contexts/ScrollAwareHeaderContext';
import { useTabBarVisibility } from '../contexts/TabBarVisibilityContext';
import { useFAB } from '../contexts/FABContext';
import { COLORS } from '../constants/colors';
import { STACK_TOP_PADDING } from '../constants/layout';
import { paymentService } from '../services/paymentService';
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';
import HeaderBackButton from '../components/navigation/HeaderBackButton';
import AddPaymentMethodModal from '../components/payment/AddPaymentMethodModal';
import { insuranceService } from '../services/insuranceService';

const { width } = Dimensions.get('window');

const readParamString = (value) => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }
  return typeof value === 'string' ? value : '';
};

const PaymentScreen = () => {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { setHeaderState } = useHeaderState();
  const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
  const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
  const { registerFAB, unregisterFAB } = useFAB();

  // Mode Detection
  const transactionIdParam = readParamString(params.transactionId);
  const historyRequestIdParam = readParamString(params.historyRequestId);
  const amountParam = readParamString(params.amount);
  const requestIdParam = readParamString(params.requestId);
  const serviceTypeParam = readParamString(params.serviceType);
  const isManagementMode = !amountParam && !requestIdParam && !serviceTypeParam;
  const emergencyRequestId = requestIdParam;
  const serviceType = serviceTypeParam || 'ambulance';
  const initialAmount = parseFloat(amountParam) || 0;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [insuranceApplied, setInsuranceApplied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cost, setCost] = useState({
    totalCost: initialAmount,
    breakdown: initialAmount > 0 ? [{ name: 'Base Service', cost: initialAmount, type: 'base' }] : []
  });

  const [walletBalance, setWalletBalance] = useState({ balance: 0, currency: 'USD' });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [consumedReceiptLinkKey, setConsumedReceiptLinkKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentRefreshCount, setPaymentRefreshCount] = useState(0);
  const receiptLinkKey = transactionIdParam
    ? `transaction:${transactionIdParam}`
    : historyRequestIdParam
      ? `request:${historyRequestIdParam}`
      : null;

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  // Load Initial Data
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();

    if (!isManagementMode) {
      loadCostAndInsurance();
    } else {
      loadWalletData();
      if (params.isLinking === 'true') {
        setShowAddModal(true);
      }
    }
  }, [isManagementMode, params.isLinking]);

  useEffect(() => {
    if (!isManagementMode) return;
    if (!transactionIdParam && !historyRequestIdParam) return;
    if (!receiptLinkKey || consumedReceiptLinkKey === receiptLinkKey) return;

    const fromHistory = paymentHistory.find((item) => {
      if (transactionIdParam) {
        return String(item?.id || '') === transactionIdParam;
      }
      return (
        String(item?.emergency_request_id || '') === historyRequestIdParam ||
        String(item?.emergency_requests?.id || '') === historyRequestIdParam
      );
    });

    if (fromHistory) {
      if (selectedTransaction?.id !== fromHistory.id) {
        setSelectedTransaction(fromHistory);
      }
      setConsumedReceiptLinkKey(receiptLinkKey);
      return;
    }

    let cancelled = false;
    (async () => {
      const linkedTransaction = await paymentService.getPaymentHistoryEntry({
        transactionId: transactionIdParam || null,
        requestId: historyRequestIdParam || null,
      });
      if (!cancelled && linkedTransaction) {
        setSelectedTransaction(linkedTransaction);
        setConsumedReceiptLinkKey(receiptLinkKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    consumedReceiptLinkKey,
    historyRequestIdParam,
    isManagementMode,
    paymentHistory,
    receiptLinkKey,
    selectedTransaction?.id,
    transactionIdParam,
  ]);

  // Data Loading Functions
  const loadWalletData = async () => {
    setIsLoadingWallet(true);
    try {
      const [balance, payments] = await Promise.all([
        paymentService.getWalletBalance(),
        paymentService.getPaymentHistory()
      ]);
      setWalletBalance(balance);
      setPaymentHistory(payments);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoadingWallet(false);
      setRefreshing(false);
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

  // Header & Tab Bar Setup
  const backButton = useCallback(() => <HeaderBackButton />, []);

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      resetHeader();
      setHeaderState({
        title: isManagementMode ? "Wallet" : "Payment",
        subtitle: isManagementMode ? "FINANCIAL HUB" : "SECURE CHECKOUT",
        icon: isManagementMode ? (
          <Ionicons name="wallet" size={26} color={isDarkMode ? '#FFFFFF' : '#0F172A'} />
        ) : (
          <Ionicons name="card" size={26} color={isDarkMode ? '#FFFFFF' : '#0F172A'} />
        ),
        backgroundColor: colors.card,
        leftComponent: backButton(),
        rightComponent: null,
        scrollAware: false, // Stack pages should not be scroll sensitive
      });

      // Context-Aware FAB for Linking Card
      if (isManagementMode) {
        registerFAB('wallet-add-card', {
          icon: 'add-circle',
          label: 'Add Card',
          subText: 'Link new payment method',
          visible: true,
          onPress: () => setShowAddModal(true),
          style: 'primary',
          haptic: 'medium',
          priority: 8,
          animation: 'prominent',
          allowInStack: true,
        });
      }

      return () => {
        if (isManagementMode) {
          unregisterFAB('wallet-add-card');
        }
      };
    }, [setHeaderState, backButton, isManagementMode, isDarkMode, registerFAB, unregisterFAB, resetHeader, resetTabBar])
  );

  const handleScroll = useCallback(
    (event) => {
      handleTabBarScroll(event);
      handleHeaderScroll(event);
    },
    [handleHeaderScroll, handleTabBarScroll]
  );

  // Actions
  const handleMethodSelect = async (method) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If in Linking Mode (from Insurance), selecting a card links it
    if (params.isLinking === 'true' && params.policyId) {
      Alert.alert(
        "Link Payment Method",
        `Do you want to link ${method.brand} •••• ${method.last4} to your ${params.providerName || 'insurance'} policy?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Link Card",
            onPress: async () => {
              try {
                setIsSaving(true);
                await insuranceService.linkPaymentMethod(params.policyId, {
                  id: method.id,
                  brand: method.brand,
                  last4: method.last4,
                  expiry_month: method.expiry_month,
                  expiry_year: method.expiry_year
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Success", "Payment method linked to policy.", [
                  { text: "OK", onPress: () => router.back() }
                ]);
              } catch (error) {
                Alert.alert("Error", "Failed to link card to policy.");
              } finally {
                setIsSaving(false);
              }
            }
          }
        ]
      );
      return;
    }

    setSelectedMethod(method);
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Selection Required', 'Please choose a payment method to continue.');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let result;

      if (selectedMethod.is_wallet) {
        result = await paymentService.processWalletPayment(
          emergencyRequestId,
          params.organizationId || 'default',
          cost
        );
      } else {
        result = await paymentService.processPayment(
          emergencyRequestId,
          params.organizationId || 'default',
          cost
        );
      }

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Completion Beat
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
        await loadWalletData();
        Alert.alert("Success", `Added $${amount} to your wallet. Your new balance is $${result.newBalance.toFixed(2)}`);
      }
    } catch (error) {
      console.error("Top-up error:", error);
      Alert.alert("Top-up Failed", "Could not process top-up. Please check your card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPaymentMethod = async (paymentMethod) => {
    try {
      setIsSaving(true);
      await paymentService.addPaymentMethod({
        ...paymentMethod,
        organizationId: params.organizationId
      });
      setPaymentRefreshCount(prev => prev + 1);
      setShowAddModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // If linking, automatically link the new card
      if (params.isLinking === 'true' && params.policyId) {
        await insuranceService.linkPaymentMethod(params.policyId, {
          id: paymentMethod.id,
          brand: paymentMethod.brand,
          last4: paymentMethod.last4,
          expiry_month: paymentMethod.expiry_month,
          expiry_year: paymentMethod.expiry_year
        });
        Alert.alert("Success", "New card added and linked to policy.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Success", "Payment method linked successfully.");
        if (isManagementMode) {
          loadWalletData(); // Refresh if in management
        }
      }
    } catch (error) {
      Alert.alert('System Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const colors = useMemo(() => ({
    text: isDarkMode ? "#FFFFFF" : "#0F172A",
    textMuted: isDarkMode ? "#94A3B8" : "#64748B",
    card: isDarkMode ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
    inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
    background: isDarkMode ? ["#0B0F1A", "#1E1B4B", "#0B0F1A"] : ["#FFFFFF", "#F3F4F6", "#FFFFFF"],
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
  }), [isDarkMode]);

  // Layout Constants
  const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
  const bottomPadding = tabBarHeight + 20;
  const ModalOverlayContainer = Platform.OS === "ios" ? BlurView : View;
  const modalOverlayProps = Platform.OS === "ios"
    ? { intensity: isDarkMode ? 60 : 80, tint: isDarkMode ? 'dark' : 'light' }
    : {};
  const modalOverlayStyle = [
    styles.modalOverlay,
    Platform.OS === "android" && {
      backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.84)",
    },
  ];

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: STACK_TOP_PADDING,
            paddingBottom: bottomPadding,
            paddingHorizontal: 12 // Matches InsuranceScreen padding-x fix
          }
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Wallet Dashboard Section - Visible ONLY in Management Mode */}
        {isManagementMode && (
          <View style={styles.walletDashboard}>
            {/* Premium Balance Card */}
            <View style={[styles.balanceCardWrapper, { borderColor: colors.border }]}>
              {Platform.OS === "ios" ? (
                <BlurView intensity={isDarkMode ? 40 : 80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLight,
                    },
                  ]}
                />
              )}
              <LinearGradient
                colors={[COLORS.brandPrimary, '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.balanceCard, { opacity: 0.9 }]}
              >
                <View style={styles.balanceHeader}>
                  <View>
                    <Text style={styles.walletLabel}>AVAILABLE BALANCE</Text>
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
                    <Text style={styles.topUpText}>Add Funds</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>

            {/* Link Payment Card Button */}
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={({ pressed }) => [
                styles.linkCardButton,
                {
                  borderColor: colors.border,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                  opacity: pressed ? 0.7 : 1
                }
              ]}
            >
              <View style={styles.linkCardContent}>
                <View style={styles.linkCardIcon}>
                  <Ionicons name="card" size={24} color={COLORS.brandPrimary} />
                </View>
                <View>
                  <Text style={[styles.linkCardTitle, { color: colors.text }]}>Link Payment Card</Text>
                  <Text style={[styles.linkCardSub, { color: colors.textMuted }]}>
                    For automatic billing & top-ups
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>

            {/* Payment Methods List */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Methods</Text>
              <PaymentMethodSelector
                selectedMethod={selectedMethod}
                onMethodSelect={handleMethodSelect}
                isDarkMode={isDarkMode}
                isManagementMode={isManagementMode}
                cost={cost}
                showAddButton={false}
                refreshTrigger={paymentRefreshCount}
              />
            </View>

            {/* Recent Activity */}
            <View style={styles.activityContainer}>
              <View style={styles.activityHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
                <Pressable onPress={() => {
                  setRefreshing(true);
                  loadWalletData();
                }}>
                  {refreshing ? <ActivityIndicator size="small" color={COLORS.brandPrimary} /> : <Text style={styles.viewAllText}>Refresh</Text>}
                </Pressable>
              </View>

              {paymentHistory.length > 0 ? (
                <View style={[styles.ledgerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {paymentHistory.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedTransaction(item)}
                      style={({ pressed }) => [
                        styles.ledgerItem,
                        index !== paymentHistory.length - 1 && [styles.ledgerDivider, { borderBottomColor: colors.border }],
                        { opacity: pressed ? 0.7 : 1 }
                      ]}
                    >
                      <View style={[
                        styles.typeIcon,
                        { backgroundColor: item.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                      ]}>
                        <Ionicons
                          name={item.status === 'completed' ? "checkmark-circle" : (item.status === 'pending' ? "time" : "close-circle")}
                          size={16}
                          color={item.status === 'completed' ? '#22C55E' : (item.status === 'pending' ? '#F59E0B' : '#EF4444')}
                        />
                      </View>
                      <View style={styles.ledgerMeta}>
                        <Text style={[styles.ledgerDesc, { color: colors.text }]}>
                          {item.emergency_requests?.service_type === 'ambulance' ? 'Ambulance Service' :
                            item.emergency_requests?.service_type === 'bed' ? 'Hospital Bed Booking' :
                              item.metadata?.source === 'top_up' ? 'Wallet Top-up' : 'Service Payment'}
                        </Text>
                        <Text style={[styles.ledgerDate, { color: colors.textMuted }]}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.ledgerAmount,
                        { color: item.status === 'completed' ? colors.text : colors.textMuted }
                      ]}>
                        ${parseFloat(item.amount).toFixed(2)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyLedger, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent transactions</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Identity Section - Hidden in Management Mode */}
        {!isManagementMode && (
          <View style={[styles.glowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total to Pay</Text>
              <Text style={[styles.totalValue, { color: COLORS.brandPrimary }]}>${cost.totalCost.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Payment Method Selector for Checkout */}
        {!isManagementMode && (
          <View style={styles.paymentSelectorContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, marginBottom: 12 }]}>
              Payment Method
            </Text>
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodSelect={handleMethodSelect}
              isDarkMode={isDarkMode}
              isManagementMode={isManagementMode}
              cost={cost}
              refreshTrigger={paymentRefreshCount}
            />
          </View>
        )}

        {/* Action Button - Hidden in Management Mode */}
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

      {/* Manual Add Payment Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <AddPaymentMethodModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPaymentMethod}
          loading={isSaving}
        />
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        visible={!!selectedTransaction}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <ModalOverlayContainer {...modalOverlayProps} style={modalOverlayStyle}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTransaction(null)} />
          <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalGrabber} />

            <View style={styles.receiptHeader}>
              <View style={[
                styles.receiptIcon,
                { backgroundColor: selectedTransaction?.transaction_type === 'credit' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(134, 16, 14, 0.1)' }
              ]}>
                <Ionicons
                  name={selectedTransaction?.transaction_type === 'credit' ? "arrow-down" : "receipt"}
                  size={32}
                  color={selectedTransaction?.transaction_type === 'credit' ? '#22C55E' : COLORS.brandPrimary}
                />
              </View>
              <Text style={[styles.receiptAmount, { color: colors.text }]}>
                {selectedTransaction?.transaction_type === 'credit' ? '+' : '-'}${Math.abs(selectedTransaction?.amount || 0).toFixed(2)}
              </Text>
              <Text style={[
                styles.receiptStatus,
                {
                  color: selectedTransaction?.status === 'completed' ? '#22C55E' :
                    (selectedTransaction?.status === 'pending' ? '#F59E0B' : '#EF4444')
                }
              ]}>
                {selectedTransaction?.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>

            <View style={styles.receiptBody}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>DESCRIPTION</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>{selectedTransaction?.description}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>DATE & TIME</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>
                  {selectedTransaction && new Date(selectedTransaction.created_at).toLocaleString()}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>TRANSACTION ID</Text>
                <Text style={[styles.receiptValue, { color: colors.text, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {selectedTransaction?.id}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>PAYMENT METHOD</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>iVisit Wallet</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setSelectedTransaction(null)}
              style={({ pressed }) => [
                styles.doneButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </ModalOverlayContainer>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
    // Padding logic handled in style prop via insets
  },
  glowCard: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  walletDashboard: {
    gap: 24,
  },
  balanceCardWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 0,
    height: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceCard: {
    padding: 24,
    height: '100%',
    justifyContent: 'space-between',
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
  linkCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  linkCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  linkCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // Success/Greenish tint or Primary
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  linkCardSub: {
    fontSize: 12,
    fontWeight: '600',
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
    borderWidth: 0,
  },
  ledgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  ledgerDivider: {
    borderBottomWidth: 0,
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
    borderWidth: 0,
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
    borderWidth: 0,
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
    borderWidth: 0,
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
    height: 0,
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
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
  },
  receiptCard: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    gap: 24,
    borderWidth: 0,
    borderBottomWidth: 0,
    paddingBottom: 40,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(120,120,120,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
  },
  receiptHeader: {
    alignItems: 'center',
    gap: 8,
  },
  receiptIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  receiptStatus: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  receiptBody: {
    gap: 16,
    backgroundColor: 'rgba(120,120,120,0.05)',
    padding: 20,
    borderRadius: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: '#000', // Or brand color
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  }
});

export default PaymentScreen;
