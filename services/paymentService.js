/**
 * iVisit Payment Service
 * Uber-like payment flow with graceful error handling
 * Supports multiple payment methods and optional insurance
 */

import { supabase } from './supabase';
import { database, StorageKeys } from '../database';
import { resolveEntityId, isValidUUID } from './displayIdService';

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

const missingHospitalOrganizationWarnings = new Set();

export const paymentService = {
  supabase,
  getStripePaymentMethodId(paymentMethod) {
    if (!paymentMethod || typeof paymentMethod !== 'object') return null;

    const metadata =
      paymentMethod.metadata && typeof paymentMethod.metadata === 'object'
        ? paymentMethod.metadata
        : {};

    const stripePaymentMethodId =
      metadata?.stripe_payment_method_id ||
      metadata?.stripePaymentMethodId ||
      metadata?.payment_method_id ||
      null;

    if (typeof stripePaymentMethodId === 'string' && stripePaymentMethodId.trim()) {
      return stripePaymentMethodId.trim();
    }

    if (typeof paymentMethod.id === 'string' && paymentMethod.id.startsWith('pm_')) {
      return paymentMethod.id;
    }

    return null;
  },

  async resolveChargeOrganizationId(organizationId) {
    let resolvedOrgId = await this.resolveId(organizationId);

    if (resolvedOrgId) {
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', resolvedOrgId)
        .maybeSingle();

      if (!orgRow) {
        const { data: hospitalRow } = await supabase
          .from('hospitals')
          .select('organization_id')
          .eq('id', resolvedOrgId)
          .maybeSingle();

        resolvedOrgId = hospitalRow?.organization_id || null;
      }
    }

    return resolvedOrgId;
  },

  /**
   * Resolve an ID (beautified or UUID) to a UUID
   */
  async resolveId(id) {
    if (!id || id === 'default' || id === 'platform') return null;
    return await resolveEntityId(id);
  },
  /**
   * Resolve any visit key (visit UUID/display_id or emergency request UUID/display_id)
   * into the canonical visits.id UUID required by tip RPCs.
   */
  async resolveVisitUuid(visitKey) {
    const rawKey = String(visitKey || "").trim();
    if (!rawKey) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const findVisitId = async (column, value) => {
      const { data, error } = await supabase
        .from('visits')
        .select('id')
        .eq('user_id', user.id)
        .eq(column, value)
        .maybeSingle();

      if (error) return null;
      return data?.id || null;
    };

    if (isValidUUID(rawKey)) {
      return (
        (await findVisitId('id', rawKey)) ||
        (await findVisitId('request_id', rawKey))
      );
    }

    const byDisplayId = await findVisitId('display_id', rawKey);
    if (byDisplayId) return byDisplayId;

    const resolvedUuid = await this.resolveId(rawKey);
    if (!isValidUUID(resolvedUuid)) return null;

    return (
      (await findVisitId('id', resolvedUuid)) ||
      (await findVisitId('request_id', resolvedUuid))
    );
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
      const resolvedOrgId = await this.resolveChargeOrganizationId(organizationId);

      if (!resolvedOrgId) {
        throw new Error('Missing valid organization context for payment intent');
      }

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
        paymentIntentId: data.paymentIntentId,
        payment: {
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId
        }
      };
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  },

  async createEmergencyCardPaymentIntent(emergencyRequestId, organizationId, cost, paymentMethod) {
    try {
      if (!emergencyRequestId) {
        throw new Error('Missing emergency request for card payment');
      }

      const resolvedOrgId = await this.resolveChargeOrganizationId(organizationId);
      if (!resolvedOrgId) {
        throw new Error('Missing valid organization context for payment intent');
      }

      const stripePaymentMethodId = this.getStripePaymentMethodId(paymentMethod);
      if (!stripePaymentMethodId) {
        throw new Error('Selected card is not linked to Stripe');
      }

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: cost.totalCost,
          currency: cost.currency,
          organization_id: resolvedOrgId,
          emergency_request_id: emergencyRequestId,
          payment_method_id: paymentMethod?.id || null,
          stripe_payment_method_id: stripePaymentMethodId,
        }
      });

      if (error) throw error;

      return {
        success: true,
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        customerId: data.customerId || null,
        stripePaymentMethodId,
      };
    } catch (error) {
      console.error('Error creating emergency card payment intent:', error);
      throw new Error(`Card payment setup failed: ${error.message}`);
    }
  },

  async waitForEmergencyPaymentSettlement(
    emergencyRequestId,
    {
      timeoutMs = 20000,
      pollIntervalMs = 1200,
    } = {}
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('id, display_id, hospital_id, hospital_name, status, payment_status, ambulance_id, responder_name, responder_phone, responder_vehicle_type, responder_vehicle_plate, updated_at')
        .eq('id', emergencyRequestId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const status = String(data?.status || '').toLowerCase();
      const paymentStatus = String(data?.payment_status || '').toLowerCase();

      if (
        data &&
        ['accepted', 'in_progress', 'arrived'].includes(status) &&
        ['completed', 'paid'].includes(paymentStatus)
      ) {
        return { success: true, request: data };
      }

      if (
        data &&
        (status === 'payment_declined' || ['failed', 'declined'].includes(paymentStatus))
      ) {
        return {
          success: false,
          code: 'PAYMENT_DECLINED',
          request: data,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return {
      success: false,
      code: 'SETTLEMENT_TIMEOUT',
    };
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
        // Org wallet ledger is linked by wallet_id (works across old/new schema variants)
        const { data: orgWallet } = await supabase
          .from('organization_wallets')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        if (!orgWallet?.id) return [];
        query = query.eq('wallet_id', orgWallet.id);
      } else {
        // Patient wallet ledger is linked by wallet_id (safer than assuming wallet_ledger.user_id exists)
        const { data: patientWallet } = await supabase
          .from('patient_wallets')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!patientWallet?.id) return [];
        query = query.eq('wallet_id', patientWallet.id);
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
   * Process a post-visit tip from patient wallet.
   * Tip is credited fully to the destination organization (no platform fee).
   */
  async processVisitTip(visitId, tipAmount, currency = 'USD') {
    try {
      if (!visitId) throw new Error('visitId is required');
      const amount = parseFloat(tipAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('tipAmount must be greater than zero');
      }
      const resolvedVisitId = await this.resolveVisitUuid(visitId);
      if (!resolvedVisitId) {
        throw new Error(`Unable to resolve visit UUID from "${visitId}"`);
      }

      const { data, error } = await supabase.rpc('process_visit_tip', {
        p_visit_id: resolvedVisitId,
        p_tip_amount: amount,
        p_currency: currency,
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Tip payment failed');
      }

      return data;
    } catch (error) {
      console.error('[paymentService] processVisitTip error:', error);
      throw error;
    }
  },

  /**
   * Record a cash tip for a completed visit.
   * Used as fallback when wallet tip cannot be processed.
   */
  async recordVisitCashTip(visitId, tipAmount, currency = 'USD') {
    try {
      if (!visitId) throw new Error('visitId is required');
      const amount = parseFloat(tipAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('tipAmount must be greater than zero');
      }
      const resolvedVisitId = await this.resolveVisitUuid(visitId);
      if (!resolvedVisitId) {
        throw new Error(`Unable to resolve visit UUID from "${visitId}"`);
      }

      const { data, error } = await supabase.rpc('record_visit_cash_tip', {
        p_visit_id: resolvedVisitId,
        p_tip_amount: amount,
        p_currency: currency,
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Cash tip could not be recorded');
      }

      return data;
    } catch (error) {
      console.error('[paymentService] recordVisitCashTip error:', error);
      throw error;
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
   * Get organization fee info for a given hospital.
   * Looks up hospital → organization → fee_percentage.
   * Returns { organizationId, feePercentage, feeTier, orgName }
   */
  async getOrganizationFee(hospitalId) {
    try {
      if (!hospitalId) return null;

      // 1. Get hospital's organization_id
      const { data: hospital, error: hospError } = await supabase
        .from('hospitals')
        .select('organization_id')
        .eq('id', hospitalId)
        .single();

      if (hospError || !hospital?.organization_id) {
        if (!missingHospitalOrganizationWarnings.has(hospitalId)) {
          missingHospitalOrganizationWarnings.add(hospitalId);
          console.warn('[paymentService] Hospital has no organization linked:', hospitalId);
        }
        return null;
      }

      const orgId = hospital.organization_id;

      // 2. Get organization fee details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, ivisit_fee_percentage, fee_tier, is_active')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        console.warn('[paymentService] Organization not found:', orgId);
        return { organizationId: orgId, feePercentage: 2.5, feeTier: 'standard', orgName: null };
      }

      return {
        organizationId: org.id,
        feePercentage: parseFloat(org.ivisit_fee_percentage || 2.5),
        feeTier: org.fee_tier || 'standard',
        orgName: org.name,
        isActive: org.is_active
      };
    } catch (error) {
      console.error('[paymentService] Error fetching org fee:', error);
      return { organizationId: null, feePercentage: 2.5, feeTier: 'standard', orgName: null };
    }
  },

  /**
   * Check if organization is eligible for cash payment.
   * Uses direct table queries instead of RPC (avoids PGRST202 schema cache issues).
   * 
   * Logic: Org wallet balance must be >= (estimatedAmount × fee_percentage / 100)
   * This ensures the org can cover the platform fee when user pays cash.
   */
  async checkCashEligibility(organizationId, estimatedAmount) {
    try {
      if (!organizationId) {
        console.warn('[paymentService] Missing organizationId for cash check');
        return false;
      }

      const amount = parseFloat(estimatedAmount) || 0;
      console.log('[paymentService] Checking Cash Eligibility (direct query):', {
        org: organizationId,
        amount
      });

      // 1. Get organization fee percentage
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('ivisit_fee_percentage, is_active')
        .eq('id', organizationId)
        .single();

      if (orgError) {
        console.error('[paymentService] Error fetching org:', orgError);
        // If we can't find the org, try querying by hospital_id 
        // (in case organizationId is actually a hospital ID)
        const { data: hospital } = await supabase
          .from('hospitals')
          .select('organization_id')
          .eq('id', organizationId)
          .single();

        if (hospital?.organization_id) {
          console.log('[paymentService] Resolved hospital→org:', hospital.organization_id);
          return this.checkCashEligibility(hospital.organization_id, estimatedAmount);
        }

        console.warn('[paymentService] Cannot resolve org for cash check, allowing');
        return true;
      }

      if (!org.is_active) {
        console.warn('[paymentService] Organization is inactive');
        return false;
      }

      const feeRate = parseFloat(org.ivisit_fee_percentage || 2.5);
      const requiredBalance = amount * (feeRate / 100);

      // 2. Get wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('organization_wallets')
        .select('balance')
        .eq('organization_id', organizationId)
        .single();

      if (walletError || !wallet) {
        console.warn('[paymentService] No wallet found for org:', organizationId);
        return false;
      }

      const balance = parseFloat(wallet.balance || 0);
      const eligible = balance >= requiredBalance;

      console.log('[paymentService] Cash Eligibility Result:', {
        orgId: organizationId,
        feeRate: `${feeRate}%`,
        requiredBalance: requiredBalance.toFixed(2),
        walletBalance: balance.toFixed(2),
        eligible
      });

      return eligible;
    } catch (error) {
      console.error('[paymentService] Cash eligibility check error:', error);
      return false;
    }
  },

  /**
   * Approve a pending cash payment (called by org_admin).
   * Deducts fee from org wallet, credits platform, updates payment + emergency status.
   * @param {string} paymentId - Payment UUID
   * @param {string} requestId - Emergency request UUID
   * @returns {Object} { success, fee_deducted, new_balance } or { success: false, error }
   */
  async approveCashPayment(paymentId, requestId) {
    try {
      console.log('[paymentService] Approving cash payment:', { paymentId, requestId });

      const { data, error } = await supabase.rpc('approve_cash_payment', {
        p_payment_id: paymentId,
        p_request_id: requestId,
      });

      if (error) {
        console.error('[paymentService] approve_cash_payment RPC error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[paymentService] approve_cash_payment returned failure:', data?.error);
        throw new Error(data?.error || 'Approval failed');
      }

      console.log('[paymentService] ✅ Cash payment approved:', data);

      // Notify the patient (non-blocking)
      try {
        const { notificationDispatcher } = await import('./notificationDispatcher');
        // Look up patient user_id from the emergency request
        const { data: reqData } = await supabase
          .from('emergency_requests')
          .select('user_id, hospital_name, service_type, display_id')
          .eq('id', requestId)
          .single();

        if (reqData) {
          await notificationDispatcher.dispatchPaymentStatusToPatient(
            reqData.user_id,
            'approved',
            {
              paymentId,
              requestId,
              hospitalName: reqData.hospital_name,
              serviceType: reqData.service_type,
              displayId: reqData.display_id,
            }
          );
        }
      } catch (notifErr) {
        console.warn('[paymentService] Patient notification failed (non-blocking):', notifErr);
      }

      return data;
    } catch (error) {
      console.error('[paymentService] approveCashPayment error:', error);
      throw error;
    }
  },

  /**
   * Demo-only helper: ask the backend demo desk to auto-approve a pending cash payment.
   * This still goes through the real approval RPC so wallet debits/credits and request state remain truthful.
   */
  async requestDemoCashAutoApproval(paymentId, requestId) {
    try {
      const { data, error } = await supabase.functions.invoke('demo-approve-cash-payment', {
        body: {
          paymentId,
          requestId,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Demo cash auto-approval failed');
      }

      return data;
    } catch (error) {
      console.error('[paymentService] requestDemoCashAutoApproval error:', error);
      throw error;
    }
  },

  /**
   * Decline a pending cash payment (called by org_admin).
   * Marks payment as declined, updates emergency status to payment_declined.
   * @param {string} paymentId - Payment UUID
   * @param {string} requestId - Emergency request UUID
   * @returns {Object} { success, status: 'declined' }
   */
  async declineCashPayment(paymentId, requestId) {
    try {
      console.log('[paymentService] Declining cash payment:', { paymentId, requestId });

      const { data, error } = await supabase.rpc('decline_cash_payment', {
        p_payment_id: paymentId,
        p_request_id: requestId,
      });

      if (error) {
        console.error('[paymentService] decline_cash_payment RPC error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[paymentService] decline_cash_payment returned failure:', data?.error);
        throw new Error(data?.error || 'Decline failed');
      }

      console.log('[paymentService] ✅ Cash payment declined:', data);

      // Notify the patient (non-blocking)
      try {
        const { notificationDispatcher } = await import('./notificationDispatcher');
        const { data: reqData } = await supabase
          .from('emergency_requests')
          .select('user_id, hospital_name, service_type, display_id')
          .eq('id', requestId)
          .single();

        if (reqData) {
          await notificationDispatcher.dispatchPaymentStatusToPatient(
            reqData.user_id,
            'declined',
            {
              paymentId,
              requestId,
              hospitalName: reqData.hospital_name,
              serviceType: reqData.service_type,
              displayId: reqData.display_id,
            }
          );
        }
      } catch (notifErr) {
        console.warn('[paymentService] Patient notification failed (non-blocking):', notifErr);
      }

      return data;
    } catch (error) {
      console.error('[paymentService] declineCashPayment error:', error);
      throw error;
    }
  },
};

