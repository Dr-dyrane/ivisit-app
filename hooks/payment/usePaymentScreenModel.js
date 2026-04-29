import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { paymentService } from '../../services/paymentService';
import { insuranceService } from '../../services/insuranceService';
// PULLBACK NOTE: Phase 2 — import useInvalidateActiveTrip to fix payment→tracking timing
// OLD: navigation happened immediately with stale state — syncActiveTripsFromServer not awaited
// NEW: invalidate TanStack Query cache before nav — deterministic refetch triggers store update
import { useInvalidateActiveTrip } from '../emergency';

const readParamString = (value) => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }
  return typeof value === 'string' ? value : '';
};

export function usePaymentScreenModel() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // PULLBACK NOTE: Phase 2 — invalidateActiveTrip replaces awaiting syncActiveTripsFromServer
  const invalidateActiveTrip = useInvalidateActiveTrip();

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

  // State
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [consumedReceiptLinkKey, setConsumedReceiptLinkKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentRefreshCount, setPaymentRefreshCount] = useState(0);
  const receiptLinkKey = transactionIdParam
    ? `transaction:${transactionIdParam}`
    : historyRequestIdParam
      ? `request:${historyRequestIdParam}`
      : null;

  // Data Loading Functions
  const loadWalletData = async () => {
    setIsLoadingWallet(true);
    try {
      // PULLBACK NOTE: fetch 100 on md+ (all items visible in unlimited scroll panel)
      // OLD: always getPaymentHistory() → default limit 20
      // NEW: 100 limit — covers virtually all real users; modal still has full history
      const historyLimit = isManagementMode ? 100 : 20;
      const [balance, payments] = await Promise.all([
        paymentService.getWalletBalance(),
        paymentService.getPaymentHistory(historyLimit)
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

  // Load Initial Data
  useEffect(() => {
    if (!isManagementMode) {
      loadCostAndInsurance();
    } else {
      loadWalletData();
      if (params.isLinking === 'true') {
        setShowAddModal(true);
      }
    }
  }, [isManagementMode, params.isLinking]);

  // Handle transaction linking from URL params
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
        Alert.alert(
          'Payment Successful',
          'Your request has been processed securely. Track your service real-time.',
          [
            {
              text: 'Track Now',
              onPress: async () => {
                // PULLBACK NOTE: PT-F — await invalidateActiveTrip before nav (defect: race on legacy payment route)
                // OLD: invalidateActiveTrip() fire-and-forget → router.push immediately → map mounts before refetch resolves
                // NEW: await invalidation so query refetch is in-flight before map screen mounts → trackingRequestKey present
                await invalidateActiveTrip();
                router.push('/(auth)/map');
              }
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

  const handleTopUp = () => {
    setShowAddFundsModal(true);
  };

  const processTopUp = async (amount) => {
    try {
      setIsSaving(true);
      const result = await paymentService.topUpWallet(amount);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadWalletData();
        setShowAddFundsModal(false);
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
          loadWalletData();
        }
      }
    } catch (error) {
      Alert.alert('System Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const refreshPaymentHistory = () => {
    setRefreshing(true);
    loadWalletData();
  };

  return {
    // Mode
    isManagementMode,
    emergencyRequestId,
    serviceType,
    
    // State
    selectedMethod,
    isSaving,
    insuranceApplied,
    showAddModal,
    cost,
    walletBalance,
    paymentHistory,
    isLoadingWallet,
    selectedTransaction,
    showHistoryModal,
    showAddFundsModal,
    refreshing,
    paymentRefreshCount,
    
    // Actions
    setSelectedMethod,
    setShowAddModal,
    setSelectedTransaction,
    setShowHistoryModal,
    setShowAddFundsModal,
    handleMethodSelect,
    handlePayment,
    handleTopUp,
    processTopUp,
    handleAddPaymentMethod,
    refreshPaymentHistory,
  };
}
