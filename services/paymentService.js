/**
 * iVisit Payment Service
 * Uber-like payment flow with graceful error handling
 * Supports multiple payment methods and optional insurance
 */

import { supabase } from './supabase';
import { database, StorageKeys } from '../database';
import { resolveEntityId } from './displayIdService';

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
   * Resolve an ID (beautified or UUID) to a UUID
   */
  async resolveId(id) {
    if (!id || id === 'default' || id === 'platform') return null;
    return await resolveEntityId(id);
  },
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
   * Get patient's Stripe status and methods
   */
  async getPatientStripeStatus() {
    try {
      const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'list-payment-methods' }
      });
      if (error) throw error;
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Stripe methods:', error);
      return [];
    }
  },

  /**
   * Create a SetupIntent for card collection
   */
  async createSetupIntent(organizationId = null) {
    const resolvedOrgId = await this.resolveId(organizationId);
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
      body: {
        action: 'create-setup-intent',
        organization_id: resolvedOrgId
      }
    });
    if (error) throw error;
    return data;
  },

  /**
   * Finalize adding payment method after Stripe confirmation
   * This updates our local reflection of the card.
   */
  async addPaymentMethod(paymentMethod) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const resolvedOrgId = await this.resolveId(paymentMethod.organizationId);

      const newMethod = {
        user_id: user.id,
        organization_id: resolvedOrgId,
        type: 'card',
        provider: 'stripe',
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
        expiry_month: paymentMethod.expiry_month,
        expiry_year: paymentMethod.expiry_year,
        is_default: true,
        metadata: { ...paymentMethod.metadata, stripe_payment_method_id: paymentMethod.id }
      };

      const { data, error } = await supabase
        .from('payment_methods')
        .insert(newMethod)
        .select()
        .single();

      if (error) throw error;
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

      // Check if methodId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(methodId)) {
        // If not a UUID (e.g. 'cash_payment', 'insurance'), we just unset the default card.
        // We also cache this choice so it persists across reloads.
        await database.write(StorageKeys.DEFAULT_PAYMENT_METHOD, { id: methodId });
        return { id: methodId, is_default: true, type: 'virtual' };
      }

      // Set new default in DB
      const { data, error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Cache the card choice too
      await database.write(StorageKeys.DEFAULT_PAYMENT_METHOD, data);

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
      const resolvedOrgId = await this.resolveId(organizationId);
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: cost.totalCost,
          currency: cost.currency,
          organization_id: resolvedOrgId,
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
   * Process payment using iVisit Wallet Balance
   */
  async processWalletPayment(emergencyRequestId, organizationId, cost) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('process_wallet_payment', {
        p_user_id: user.id,
        p_organization_id: organizationId,
        p_emergency_request_id: emergencyRequestId,
        p_amount: cost.totalCost,
        p_currency: cost.currency || 'USD'
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Wallet payment failed');

      return {
        success: true,
        paymentId: data.payment_id,
        newBalance: data.new_balance
      };
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      throw error;
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
   * Uses real Stripe PaymentIntents for the most secure funding flow.
   */
  async topUpWallet(amount) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Create a PaymentIntent for the top-up
      // Note: We use a special system org ID or flag for platform top-ups
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: amount,
          currency: 'USD',
          is_top_up: true // Signal to Edge Function to credit patient wallet on success
        }
      });

      if (error) throw error;

      return {
        success: true,
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId
      };
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

      // Fetch profile to see if they are an Org Admin/Member
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      let query = supabase.from('wallet_ledger').select('*');

      if (profile?.organization_id) {
        // If Org User, show both personal and organizational ledger entries
        query = query.or(`user_id.eq.${user.id},organization_id.eq.${profile.organization_id}`);
      } else {
        // Standard Patient
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching wallet ledger:', error);
      return [];
    }
  },

  /**
   * Process cash payment with fee deduction
   * Deducts platform fee from organization wallet and records payment
   */
  async processCashPayment(emergencyRequestId, organizationId, amount, currency = 'USD') {
    try {
      if (!emergencyRequestId || !organizationId || !amount) {
        throw new Error('Missing required parameters for cash payment processing');
      }

      console.log('[paymentService] Processing Cash Payment V2:', { 
        requestId: emergencyRequestId, 
        orgId: organizationId, 
        amount: parseFloat(amount) 
      });

      const { data, error } = await supabase.rpc('process_cash_payment_v2', {
        p_emergency_request_id: emergencyRequestId.toString(),
        p_organization_id: organizationId.toString(),
        p_amount: parseFloat(amount),
        p_currency: currency
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Cash payment processing failed');
      }

      console.log('[paymentService] Cash Payment Processed:', { 
        paymentId: data.payment_id, 
        feeDeducted: data.fee_deducted 
      });

      return {
        success: true,
        paymentId: data.payment_id,
        feeDeducted: data.fee_deducted,
        message: data.message
      };
    } catch (error) {
      console.error('[paymentService] Error processing cash payment:', error);
      throw error;
    }
  },

  /**
   * Check if organization is eligible for cash payment
   * Based on their wallet balance covering the estimated platform fee.
   */
  async checkCashEligibility(organizationId, estimatedAmount) {
    try {
      if (!organizationId) {
        console.warn('[paymentService] Missing organizationId for cash check');
        return false;
      }

      console.log('[paymentService] Checking Cash Eligibility V2:', { org: organizationId.toString(), amount: parseFloat(estimatedAmount) });

      const { data, error } = await supabase.rpc('check_cash_eligibility_v2', {
        p_organization_id: organizationId.toString(),
        p_estimated_amount: parseFloat(estimatedAmount) || 0
      });

      if (error) throw error;
      return !!data;
    } catch (error) {
      // Fallback: If Schema Cache is stale (PGRST202), allow to proceed
      if (error?.code === 'PGRST202' || error?.message?.includes('schema cache')) {
        console.warn('[paymentService] ⚠️ Bypassing Cash Check: Schema Cache Stale (PGRST202)');
        return true;
      }
      console.error('Error checking cash eligibility:', error);
      return false;
    }
  }
};
