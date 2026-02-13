/**
 * Payment Flow Hook for Emergency Requests
 * Integrates payment processing into emergency request flow
 */

import { useState, useCallback, useRef } from 'react';
import { paymentService } from '../../services/paymentService';
import { router } from 'expo-router';

export const usePaymentFlow = () => {
  const [paymentState, setPaymentState] = useState({
    isProcessing: false,
    paymentRequired: false,
    paymentCompleted: false,
    error: null
  });

  const currentPaymentRef = useRef(null);

  /**
   * Check if payment is required for emergency request
   */
  const checkPaymentRequirement = useCallback(async (emergencyRequest) => {
    try {
      // Calculate cost for the emergency request
      const cost = await paymentService.calculateTripCost(
        emergencyRequest.serviceType,
        {
          distance: emergencyRequest.distance,
          isUrgent: emergencyRequest.isUrgent
        }
      );

      // Check if user has insurance coverage
      const { data: { user } } = await paymentService.supabase.auth.getUser();
      if (user) {
        const insuranceResult = await paymentService.applyInsuranceCoverage(user.id, cost);
        
        // If insurance covers full cost, no payment required
        if (insuranceResult.userCost === 0) {
          setPaymentState(prev => ({
            ...prev,
            paymentRequired: false,
            paymentCompleted: true
          }));
          return {
            paymentRequired: false,
            cost: insuranceResult.adjustedCost,
            insuranceApplied: true
          };
        }
      }

      // Payment required if no full insurance coverage
      setPaymentState(prev => ({
        ...prev,
        paymentRequired: true,
        paymentCompleted: false
      }));

      return {
        paymentRequired: true,
        cost,
        insuranceApplied: false
      };
    } catch (error) {
      console.error('Error checking payment requirement:', error);
      setPaymentState(prev => ({
        ...prev,
        error: error.message
      }));
      return {
        paymentRequired: true,
        error: error.message
      };
    }
  }, []);

  /**
   * Initiate payment flow for emergency request
   */
  const initiatePayment = useCallback(async (emergencyRequest, cost) => {
    try {
      setPaymentState(prev => ({
        ...prev,
        isProcessing: true,
        error: null
      }));

      // Get user's payment methods
      const paymentMethods = await paymentService.getPaymentMethods();
      
      if (paymentMethods.length === 0) {
        // No payment methods - redirect to add payment method
        setPaymentState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'No payment methods available'
        }));
        
        router.push('/payment/add-method');
        return { success: false, error: 'No payment methods available' };
      }

      // Get default payment method
      const defaultMethod = paymentMethods.find(m => m.is_default) || paymentMethods[0];
      
      // Navigate to payment screen
      router.push({
        pathname: '/payment',
        params: {
          emergencyRequestId: emergencyRequest.id,
          serviceType: emergencyRequest.serviceType,
          cost: JSON.stringify(cost)
        }
      });

      return { success: true, paymentMethod: defaultMethod };
    } catch (error) {
      console.error('Error initiating payment:', error);
      setPaymentState(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Process payment automatically (for quick emergencies)
   */
  const processAutoPayment = useCallback(async (emergencyRequest, cost) => {
    try {
      setPaymentState(prev => ({
        ...prev,
        isProcessing: true,
        error: null
      }));

      // Get default payment method
      const paymentMethods = await paymentService.getPaymentMethods();
      const defaultMethod = paymentMethods.find(m => m.is_default);
      
      if (!defaultMethod) {
        throw new Error('No default payment method found');
      }

      // Process payment
      const result = await paymentService.processPayment(
        emergencyRequest.id,
        defaultMethod.id,
        cost
      );

      if (result.success) {
        setPaymentState(prev => ({
          ...prev,
          isProcessing: false,
          paymentCompleted: true,
          error: null
        }));
        
        currentPaymentRef.current = result.payment;
        return { success: true, payment: result.payment };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error processing auto payment:', error);
      setPaymentState(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Handle payment completion
   */
  const handlePaymentCompleted = useCallback((payment) => {
    setPaymentState(prev => ({
      ...prev,
      isProcessing: false,
      paymentCompleted: true,
      error: null
    }));
    
    currentPaymentRef.current = payment;
  }, []);

  /**
   * Handle payment failure
   */
  const handlePaymentFailed = useCallback((error) => {
    setPaymentState(prev => ({
      ...prev,
      isProcessing: false,
      paymentCompleted: false,
      error
    }));
  }, []);

  /**
   * Reset payment state
   */
  const resetPaymentState = useCallback(() => {
    setPaymentState({
      isProcessing: false,
      paymentRequired: false,
      paymentCompleted: false,
      error: null
    });
    currentPaymentRef.current = null;
  }, []);

  /**
   * Get current payment
   */
  const getCurrentPayment = useCallback(() => {
    return currentPaymentRef.current;
  }, []);

  return {
    // State
    paymentState,
    
    // Actions
    checkPaymentRequirement,
    initiatePayment,
    processAutoPayment,
    handlePaymentCompleted,
    handlePaymentFailed,
    resetPaymentState,
    getCurrentPayment,
    
    // Computed values
    isPaymentProcessing: paymentState.isProcessing,
    isPaymentRequired: paymentState.paymentRequired,
    isPaymentCompleted: paymentState.paymentCompleted,
    paymentError: paymentState.error
  };
};
