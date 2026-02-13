/**
 * Payment Processing Screen
 * Shows payment progress and handles errors gracefully
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';
import { paymentService, PAYMENT_STATUS } from '../../services/paymentService';

const PaymentProcessingScreen = ({ 
  emergencyRequestId, 
  paymentMethod, 
  cost, 
  onSuccess, 
  onError, 
  onRetry 
}) => {
  const { isDarkMode } = useTheme();
  const [status, setStatus] = useState(PAYMENT_STATUS.PROCESSING);
  const [error, setError] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
  const bgColor = isDarkMode ? '#0B0F1A' : '#FFFFFF';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();

    processPayment();
  }, []);

  const processPayment = async () => {
    try {
      setStatus(PAYMENT_STATUS.PROCESSING);
      
      const result = await paymentService.processPayment(
        emergencyRequestId,
        paymentMethod.id,
        cost
      );

      if (result.success) {
        setStatus(PAYMENT_STATUS.COMPLETED);
        setTransactionId(result.payment.transaction_id);
        
        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();

        setTimeout(() => {
          onSuccess?.(result.payment);
        }, 1500);
      } else {
        setStatus(PAYMENT_STATUS.FAILED);
        setError(result.error || 'Payment failed');
        onError?.(result.error);
      }
    } catch (error) {
      setStatus(PAYMENT_STATUS.FAILED);
      setError(error.message || 'Payment processing failed');
      onError?.(error.message);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus(PAYMENT_STATUS.PROCESSING);
    processPayment();
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Our support team is available 24/7 to help you with payment issues.\n\nPhone: 1-800-IVISIT\nEmail: support@ivisit.com',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const renderContent = () => {
    switch (status) {
      case PAYMENT_STATUS.PROCESSING:
        return (
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.brandPrimary + '20' }]}>
              <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Processing Payment</Text>
            <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>
              Please wait while we process your payment of ${cost.totalCost.toFixed(2)}
            </Text>
            <View style={styles.detailsContainer}>
              <Text style={[styles.detailText, { color: COLORS.textMuted }]}>
                Payment Method: {paymentMethod.type === 'card' ? `${paymentMethod.brand} •••• ${paymentMethod.last4}` : paymentMethod.provider}
              </Text>
            </View>
          </Animated.View>
        );

      case PAYMENT_STATUS.COMPLETED:
        return (
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Payment Successful</Text>
            <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>
              Your payment of ${cost.totalCost.toFixed(2)} has been processed successfully
            </Text>
            {transactionId && (
              <View style={styles.transactionContainer}>
                <Text style={[styles.transactionLabel, { color: COLORS.textMuted }]}>
                  Transaction ID:
                </Text>
                <Text style={[styles.transactionId, { color: textColor }]}>
                  {transactionId}
                </Text>
              </View>
            )}
          </Animated.View>
        );

      case PAYMENT_STATUS.FAILED:
        return (
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.error + '20' }]}>
              <Ionicons name="close-circle" size={60} color={COLORS.error} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Payment Failed</Text>
            <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>
              We couldn't process your payment
            </Text>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: COLORS.error }]}>
                  {error}
                </Text>
              </View>
            )}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: COLORS.brandPrimary }]}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.supportButton, { borderColor: COLORS.brandPrimary }]}
                onPress={handleContactSupport}
              >
                <Text style={[styles.supportButtonText, { color: COLORS.brandPrimary }]}>
                  Contact Support
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    width: '100%',
  },
  detailText: {
    fontSize: 14,
    textAlign: 'center',
  },
  transactionContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  transactionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtons: {
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
  supportButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentProcessingScreen;
