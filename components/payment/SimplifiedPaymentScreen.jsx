/**
 * Simplified Payment Screen
 * Uber-like payment experience - no complexity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { useSimplifiedPaymentFlow } from '../../hooks/emergency/useSimplifiedPaymentFlow';
import PaymentMethodSelector from './PaymentMethodSelector';
import AddPaymentMethodModal from './AddPaymentMethodModal';

const SimplifiedPaymentScreen = ({ 
  emergencyRequest, 
  onPaymentComplete, 
  onPaymentError,
  onBack 
}) => {
  const { isDarkMode } = useTheme();
  const paymentFlow = useSimplifiedPaymentFlow();
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const bgColor = isDarkMode ? '#0B0F1A' : '#FFFFFF';
  const cardBg = isDarkMode ? '#1A1F2E' : '#F9FAFB';

  useEffect(() => {
    // Start payment flow when component mounts
    paymentFlow.startPaymentFlow(emergencyRequest);
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  }, [emergencyRequest]);

  useEffect(() => {
    // Handle payment completion
    if (paymentFlow.isComplete) {
      onPaymentComplete?.(paymentFlow.paymentState.payment);
    }
  }, [paymentFlow.isComplete]);

  useEffect(() => {
    // Handle payment errors
    if (paymentFlow.hasError) {
      onPaymentError?.(paymentFlow.paymentState.error);
    }
  }, [paymentFlow.hasError]);

  const handleQuickPay = async () => {
    const result = await paymentFlow.quickPay();
    if (result.success) {
      // Success handled by useEffect above
    }
  };

  const handleSelectAndPay = async () => {
    if (!selectedMethod) {
      Alert.alert('Payment Method', 'Please select a payment method');
      return;
    }

    const result = await paymentFlow.selectAndPay(selectedMethod);
    if (result.success) {
      // Success handled by useEffect above
    }
  };

  const handleAddMethod = async (methodData) => {
    const result = await paymentFlow.addPaymentMethod(methodData);
    if (result.success) {
      setShowAddMethod(false);
      setSelectedMethod(result.paymentMethod);
    }
  };

  if (paymentFlow.isProcessing) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          <Text style={[styles.processingText, { color: textColor }]}>
            Processing Payment...
          </Text>
          <Text style={[styles.processingSubtext, { color: COLORS.textMuted }]}>
            Please don't close this app
          </Text>
        </View>
      </View>
    );
  }

  if (paymentFlow.isComplete) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Animated.View 
          style={[
            styles.completeContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.successIcon, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
          </View>
          <Text style={[styles.completeTitle, { color: textColor }]}>
            Payment Successful!
          </Text>
          <Text style={[styles.completeMessage, { color: COLORS.textMuted }]}>
            Your emergency request has been confirmed
          </Text>
          <Text style={[styles.amount, { color: textColor }]}>
            ${paymentFlow.totalCost.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: COLORS.brandPrimary }]}
            onPress={() => onPaymentComplete?.(paymentFlow.paymentState.payment)}
          >
            <Text style={styles.doneButtonText}>Track Emergency</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (paymentFlow.hasError) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: COLORS.error + '20' }]}>
            <Ionicons name="close-circle" size={60} color={COLORS.error} />
          </View>
          <Text style={[styles.errorTitle, { color: textColor }]}>
            Payment Failed
          </Text>
          <Text style={[styles.errorMessage, { color: COLORS.textMuted }]}>
            {paymentFlow.paymentState.error}
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
              onPress={paymentFlow.retryPayment}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backButton, { borderColor: COLORS.border }]}
              onPress={onBack}
            >
              <Text style={[styles.backButtonText, { color: textColor }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: bgColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Payment
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cost Display - Simple and Clear */}
        <Animated.View 
          style={[
            styles.costCard, 
            { 
              backgroundColor: cardBg,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.costLabel, { color: COLORS.textMuted }]}>
            Total Cost
          </Text>
          <Text style={[styles.costAmount, { color: textColor }]}>
            ${paymentFlow.totalCost.toFixed(2)}
          </Text>
          
          {paymentFlow.hasInsurance && (
            <View style={styles.insuranceInfo}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
              <Text style={[styles.insuranceText, { color: COLORS.success }]}>
                Insurance saved you ${paymentFlow.insuranceSavings.toFixed(2)}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Quick Pay Option - Like Uber */}
        {paymentFlow.isReady && (
          <TouchableOpacity
            style={[styles.quickPayButton, { backgroundColor: COLORS.brandPrimary }]}
            onPress={handleQuickPay}
          >
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.quickPayText}>Quick Pay with Default</Text>
          </TouchableOpacity>
        )}

        {/* Payment Method Selection */}
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onMethodSelect={setSelectedMethod}
          cost={paymentFlow.paymentState.cost}
          showAddButton={true}
        />

        {/* Add Payment Method Button */}
        <TouchableOpacity
          style={[styles.addMethodButton, { borderColor: COLORS.brandPrimary }]}
          onPress={() => setShowAddMethod(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.brandPrimary} />
          <Text style={[styles.addMethodText, { color: COLORS.brandPrimary }]}>
            Add Payment Method
          </Text>
        </TouchableOpacity>

        {/* Pay Button */}
        {selectedMethod && (
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: COLORS.brandPrimary }]}
            onPress={handleSelectAndPay}
          >
            <Text style={styles.payButtonText}>
              Pay ${paymentFlow.totalCost.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textMuted} />
          <Text style={[styles.securityText, { color: COLORS.textMuted }]}>
            Your payment is secure and encrypted
          </Text>
        </View>
      </ScrollView>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        visible={showAddMethod}
        onClose={() => setShowAddMethod(false)}
        onAdd={handleAddMethod}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  costCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  costLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  costAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  insuranceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  insuranceText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  quickPayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addMethodText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  payButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  securityText: {
    fontSize: 12,
    marginLeft: 6,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: COLORS.error,
  },
  errorActions: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimplifiedPaymentScreen;
