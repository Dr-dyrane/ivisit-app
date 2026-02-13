/**
 * iVisit Payment Service
 * Uber-like payment flow with graceful error handling
 * Supports multiple payment methods and optional insurance
 */

import { supabase } from './supabase';
import { database, StorageKeys } from '../database';

// Payment method types
export const PAYMENT_METHODS = {
  CARD: 'card',
  DIGITAL_WALLET: 'digital_wallet',
  CASH: 'cash',
  INSURANCE: 'insurance'
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Service pricing (simplified)
const SERVICE_PRICING = {
  ambulance: {
    base: 150.00,
    currency: 'USD',
    description: 'Emergency ambulance service'
  },
  consultation: {
    base: 100.00,
    currency: 'USD',
    description: 'Emergency consultation'
  },
  bed_booking: {
    base: 200.00,
    currency: 'USD',
    description: 'Emergency bed booking'
  }
};

export const paymentService = {
  supabase,
  /**
   * Get user's payment methods
   */
  async getPaymentMethods() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache locally for offline use
      await database.write(StorageKeys.PAYMENT_METHODS, data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Return cached methods on error
      return await database.read(StorageKeys.PAYMENT_METHODS, []);
    }
  },

  /**
   * Add new payment method
   */
  async addPaymentMethod(paymentMethod) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if this is the first payment method
      const { count } = await supabase
        .from('payment_methods')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const isFirst = count === 0;

      const newMethod = {
        user_id: user.id,
        type: paymentMethod.type,
        provider: paymentMethod.provider,
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
        expiry_month: paymentMethod.expiry_month,
        expiry_year: paymentMethod.expiry_year,
        is_default: isFirst,
        metadata: paymentMethod.metadata || {}
      };

      const { data, error } = await supabase
        .from('payment_methods')
        .insert(newMethod)
        .select()
        .single();

      if (error) throw error;

      // Update cache
      const methods = await this.getPaymentMethods();
      await database.write(StorageKeys.PAYMENT_METHODS, methods);

      return data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw new Error(`Failed to add payment method: ${error.message}`);
    }
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(methodId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Unset all defaults for user
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { data, error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  },

  /**
   * Remove payment method
   */
  async removePaymentMethod(methodId) {
    try {
      // Check if it's default
      const { data: method } = await supabase
        .from('payment_methods')
        .select('is_default')
        .eq('id', methodId)
        .single();

      if (method?.is_default) {
        throw new Error('Cannot remove default payment method. Please set another method as default first.');
      }

      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: false })
        .eq('id', methodId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw new Error(`Failed to remove payment method: ${error.message}`);
    }
  },

  /**
   * Calculate Service Fee (Deductive/Surcharge Balance)
   * Ensures the service provider receives exactly the quoted base amount.
   */
  calculateServiceFee(baseAmount) {
    const feeRate = 0.025; // 2.5% platform fee

    const totalWithFee = baseAmount / (1 - feeRate);
    const feeAmount = totalWithFee - baseAmount;

    return {
      total: parseFloat(totalWithFee.toFixed(2)),
      fee: parseFloat(feeAmount.toFixed(2)),
      feeRate: feeRate * 100,
      description: 'iVisit Service Guarantee'
    };
  },

  /**
   * Calculate trip cost with iVisit Platform Fees
   */
  async calculateTripCost(serviceType, options = {}) {
    try {
      const basePrice = SERVICE_PRICING[serviceType];
      if (!basePrice) {
        throw new Error(`Unknown service type: ${serviceType}`);
      }

      let subtotal = basePrice.base;
      const breakdown = [{
        name: basePrice.description,
        cost: basePrice.base,
        type: 'base'
      }];

      // Add distance surcharge if provided
      if (options.distance && options.distance > 5) {
        const distanceSurcharge = Math.ceil((options.distance - 5) * 2);
        subtotal += distanceSurcharge;
        breakdown.push({
          name: 'Distance surcharge',
          cost: distanceSurcharge,
          type: 'distance'
        });
      }

      // Add urgency surcharge if applicable
      if (options.isUrgent) {
        const urgencySurcharge = 25;
        subtotal += urgencySurcharge;
        breakdown.push({
          name: 'Urgency surcharge',
          cost: urgencySurcharge,
          type: 'urgency'
        });
      }

      // Calculate the service fee
      const pricing = this.calculateServiceFee(subtotal);

      breakdown.push({
        name: pricing.description,
        cost: pricing.fee,
        type: 'fee'
      });

      return {
        totalCost: pricing.total,
        baseHospitalPay: subtotal,
        breakdown,
        currency: basePrice.currency,
        serviceType,
        pricing
      };
    } catch (error) {
      console.error('Error calculating trip cost:', error);
      throw error;
    }
  },

  /**
   * Process payment for emergency request using Stripe Edge Function
   */
  async processPayment(emergencyRequestId, organizationId, cost) {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: cost.totalCost,
          currency: cost.currency,
          organization_id: organizationId,
          emergency_request_id: emergencyRequestId
        }
      });

      if (error) throw error;

      return {
        success: true,
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId
      };
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  },

  /**
   * Request payout for an organization
   */
  async requestPayout(organizationId, amount, currency = 'USD') {
    try {
      const { data, error } = await supabase.functions.invoke('create-payout', {
        body: {
          amount,
          currency,
          organization_id: organizationId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw new Error(`Payout request failed: ${error.message}`);
    }
  },

  /**
   * Get payment history
   */
  async getPaymentHistory(limit = 20) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          emergency_requests (
            id,
            service_type,
            created_at,
            hospitals (
              name,
              address
            )
          ),
          payment_methods (
            type,
            last4,
            brand,
            provider
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  },

  /**
   * Apply insurance coverage if available
   */
  async applyInsuranceCoverage(userId, cost) {
    try {
      const { data: policy, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .eq('status', 'active')
        .single();

      if (error || !policy) {
        return {
          hasInsurance: false,
          userCost: cost.totalCost,
          insuranceCoverage: 0,
          adjustedCost: cost
        };
      }

      const coverageDetails = policy.coverage_details || {};
      const coverageLimit = coverageDetails.limit || 50000;
      const copay = coverageDetails.copay || 0;

      let insuranceCoverage = Math.min(cost.totalCost, coverageLimit);
      let userCost = Math.max(0, cost.totalCost - insuranceCoverage) + copay;

      return {
        hasInsurance: true,
        policyName: policy.provider_name,
        policyNumber: policy.policy_number,
        userCost,
        insuranceCoverage,
        copay,
        adjustedCost: {
          ...cost,
          totalCost: userCost,
          originalCost: cost.totalCost,
          insuranceApplied: true
        }
      };
    } catch (error) {
      console.error('Error applying insurance coverage:', error);
      return {
        hasInsurance: false,
        userCost: cost.totalCost,
        insuranceCoverage: 0,
        adjustedCost: cost
      };
    }
  },

  /**
   * Get patient wallet balance
   */
  async getWalletBalance() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { balance: 0, currency: 'USD' };

      const { data, error } = await supabase
        .from('patient_wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No wallet found, create one via RPC if possible or just return 0
          return { balance: 0, currency: 'USD' };
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return { balance: 0, currency: 'USD' };
    }
  },

  /**
   * Top up patient wallet
   */
  async topUpWallet(amount) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call secure RPC to perform top-up
      const { data, error } = await supabase.rpc('top_up_patient_wallet', {
        p_user_id: user.id,
        p_amount: amount
      });

      if (error) throw error;
      return { success: true, newBalance: data };
    } catch (error) {
      console.error('Error topping up wallet:', error);
      throw error;
    }
  },

  /**
   * Get patient transaction ledger
   */
  async getWalletLedger(limit = 10) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching wallet ledger:', error);
      return [];
    }
  }
};
