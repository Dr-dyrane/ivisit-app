/**
 * Simplified Payment Flow Hook
 * Uber-like experience for users without insurance
 */

import { useState, useCallback } from 'react';
import { paymentService } from '../../services/paymentService';

export const useSimplifiedPaymentFlow = () => {
  const [paymentState, setPaymentState] = useState({
    step: 'ready', // 'ready', 'selecting', 'processing', 'complete', 'error'
    cost: null,
    paymentMethod: null,
    error: null
  });

  /**
   * Start simplified payment flow
   * Like Uber: show cost, select payment, done
   */
  const startPaymentFlow = useCallback(async (emergencyRequest) => {
    try {
      setPaymentState(prev => ({ ...prev, step: 'selecting', error: null }));

      // Calculate cost - simple and transparent
      const cost = await paymentService.calculateTripCost(
        emergencyRequest.serviceType,
        {
          distance: emergencyRequest.distance || 0,
          isUrgent: emergencyRequest.isUrgent || false
        }
      );

      // Check insurance (optional - don't make it complex)
      const { data: { user } } = await paymentService.supabase.auth.getUser();
      let finalCost = cost;
      let hasInsurance = false;

      if (user) {
        try {
          const insuranceResult = await paymentService.applyInsuranceCoverage(user.id, cost);
          if (insuranceResult.hasInsurance && insuranceResult.userCost < cost.totalCost) {
            finalCost = insuranceResult.adjustedCost;
            hasInsurance = true;
          }
        } catch (error) {
          // Insurance check fails - continue without it
          console.log('Insurance check failed, continuing without:', error);
        }
      }

      setPaymentState(prev => ({
        ...prev,
        step: 'ready',
        cost: finalCost,
        hasInsurance,
        originalCost: hasInsurance ? cost : null
      }));

      return { success: true, cost: finalCost, hasInsurance };
    } catch (error) {
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Quick pay with default method
   * Like Uber's "Pay with default card"
   */
  const quickPay = useCallback(async () => {
    try {
      setPaymentState(prev => ({ ...prev, step: 'processing', error: null }));

      // Get default payment method
      const paymentMethods = await paymentService.getPaymentMethods();
      const defaultMethod = paymentMethods.find(m => m.is_default);

      if (!defaultMethod) {
        throw new Error('No default payment method. Please add a payment method first.');
      }

      // Process payment
      const result = await paymentService.processPayment(
        paymentState.cost.emergencyRequestId || 'quick_emergency',
        defaultMethod.id,
        paymentState.cost
      );

      if (result.success) {
        setPaymentState(prev => ({
          ...prev,
          step: 'complete',
          paymentMethod: defaultMethod,
          error: null
        }));
        return { success: true, payment: result.payment };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, [paymentState.cost]);

  /**
   * Select payment method and pay
   */
  const selectAndPay = useCallback(async (paymentMethod) => {
    try {
      setPaymentState(prev => ({ ...prev, step: 'processing', error: null }));

      const result = await paymentService.processPayment(
        paymentState.cost.emergencyRequestId || 'emergency_payment',
        paymentMethod.id,
        paymentState.cost
      );

      if (result.success) {
        setPaymentState(prev => ({
          ...prev,
          step: 'complete',
          paymentMethod,
          error: null
        }));
        return { success: true, payment: result.payment };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, [paymentState.cost]);

  /**
   * Add new payment method
   */
  const addPaymentMethod = useCallback(async (paymentMethodData) => {
    try {
      const newMethod = await paymentService.addPaymentMethod(paymentMethodData);
      
      // Auto-select the new method for convenience
      setPaymentState(prev => ({
        ...prev,
        paymentMethod: newMethod
      }));

      return { success: true, paymentMethod: newMethod };
    } catch (error) {
      setPaymentState(prev => ({
        ...prev,
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Retry payment
   */
  const retryPayment = useCallback(() => {
    setPaymentState(prev => ({
      ...prev,
      step: 'ready',
      error: null
    }));
  }, []);

  /**
   * Reset payment flow
   */
  const resetPaymentFlow = useCallback(() => {
    setPaymentState({
      step: 'ready',
      cost: null,
      paymentMethod: null,
      error: null
    });
  }, []);

  /**
   * Get payment methods for user
   */
  const getAvailablePaymentMethods = useCallback(async () => {
    try {
      const methods = await paymentService.getPaymentMethods();
      return methods;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }, []);

  return {
    // State
    paymentState,
    
    // Computed values
    isReady: paymentState.step === 'ready',
    isSelecting: paymentState.step === 'selecting',
    isProcessing: paymentState.step === 'processing',
    isComplete: paymentState.step === 'complete',
    hasError: paymentState.step === 'error',
    
    // Cost info
    totalCost: paymentState.cost?.totalCost || 0,
    hasInsurance: paymentState.hasInsurance || false,
    insuranceSavings: paymentState.hasInsurance ? 
      (paymentState.originalCost?.totalCost || 0) - (paymentState.cost?.totalCost || 0) : 0,
    
    // Actions
    startPaymentFlow,
    quickPay,
    selectAndPay,
    addPaymentMethod,
    retryPayment,
    resetPaymentFlow,
    getAvailablePaymentMethods
  };
};
