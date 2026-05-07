/**
 * Service Cost Service
 * Handles cost calculation for emergency services and links to payment system
 */

import { supabase } from './supabase';
import { emergencyRequestsService } from './emergencyRequestsService';
import { formatMoney, resolveMoneyCurrency } from '../utils/formatMoney';

export const serviceCostService = {
  /**
   * Get service costs configuration
   */
  async getServiceCosts() {
    try {
      const { data, error } = await supabase
        .from('service_pricing')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching service costs:', error);
      return this.getMockServiceCosts();
    }
  },

  /**
   * Calculate cost for emergency request
   */
  async calculateEmergencyCost(serviceType, options = {}) {
    try {
      const { distance = 0, hospitalId = null } = options;
      const ambulanceType =
        typeof options.ambulanceType === 'string' ? options.ambulanceType :
          (typeof options.ambulanceId === 'string' && !/^[0-9a-f]{8}-/i.test(options.ambulanceId) ? options.ambulanceId : null);

      // Call the database function v2 (to avoid overload ambiguity)
      const { data, error } = await supabase
        .rpc('calculate_emergency_cost_v2', {
          p_service_type: serviceType,
          p_hospital_id: hospitalId,
          p_ambulance_type: ambulanceType,
          p_distance_km: Number(distance) || 0
        });

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error('Error calculating emergency cost:', error);
      return this.getMockCost(serviceType, options);
    }
  },

  /**
   * Update emergency request with payment information
   */
  async updateEmergencyPayment(emergencyRequestId, paymentData) {
    try {
      const requestKey = String(emergencyRequestId ?? '');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(requestKey);

      let resolvedRequestId = requestKey;
      if (!isUuid) {
        const { data: requestRow, error: lookupError } = await supabase
          .from('emergency_requests')
          .select('id')
          .eq('display_id', requestKey)
          .limit(1)
          .maybeSingle();

        if (lookupError) throw lookupError;
        if (!requestRow?.id) {
          throw new Error(`Emergency request not found: ${requestKey}`);
        }
        resolvedRequestId = requestRow.id;
      }

      const rpcPayload = {};
      if (paymentData?.status) {
        rpcPayload.payment_status = paymentData.status;
      }
      if (paymentData?.paymentId) {
        rpcPayload.payment_method_id = paymentData.paymentId;
      }

      const { data: rpcResult, error } = await supabase.rpc('console_update_emergency_request', {
        p_request_id: resolvedRequestId,
        p_payload: rpcPayload,
      });

      if (error) throw error;
      if (!rpcResult?.success || !rpcResult?.request) {
        throw new Error(rpcResult?.error || 'Emergency payment update failed');
      }

      return rpcResult.request;
    } catch (error) {
      console.error('Error updating emergency payment:', error);
      throw error;
    }
  },

  /**
   * Get emergency requests with payment status
   */
  async getEmergencyRequestsWithPayment(userId, filters = {}) {
    try {
      let query = supabase
        .from('emergency_requests')
        .select(`
          *,
          payments (
            id,
            status,
            amount,
            payment_method,
            created_at
          )
        `)
        .eq('user_id', userId);

      // Apply filters
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.service_type) {
        query = query.eq('service_type', filters.service_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching emergency requests with payment:', error);
      return [];
    }
  },

  /**
   * Create emergency request with cost calculation
   */
  async createEmergencyRequestWithCost(requestData) {
    try {
      // Calculate cost first
      const cost = await this.calculateEmergencyCost(
        requestData.service_type,
        {
          distance: requestData.distance || 0,
          isUrgent: requestData.is_urgent || false,
          hospitalId: requestData.hospital_id || null
        }
      );

      const created = await emergencyRequestsService.create({
        requestId: requestData?.display_id || requestData?.requestId,
        serviceType: requestData?.service_type || requestData?.serviceType,
        hospitalId: requestData?.hospital_id || requestData?.hospitalId,
        hospitalName: requestData?.hospital_name || requestData?.hospitalName,
        specialty: requestData?.specialty,
        ambulanceType: requestData?.ambulance_type || requestData?.ambulanceType,
        patient: requestData?.patient_snapshot || requestData?.patient || null,
        patientLocation:
          requestData?.patient_location ||
          requestData?.patientLocation ||
          requestData?.pickup_location ||
          null,
        total_cost: cost.total_cost,
        payment_status: requestData?.payment_status || 'pending',
        payment_method_id:
          requestData?.payment_method_id ||
          requestData?.paymentMethodId ||
          requestData?.payment_method ||
          null,
        feeAmount: requestData?.fee_amount || null,
        currency: requestData?.currency || 'USD',
      });

      return created;
    } catch (error) {
      console.error('Error creating emergency request with cost:', error);
      throw error;
    }
  },

  /**
   * Get cost breakdown for display
   */
  getCostBreakdownDisplay(cost) {
    if (!cost || !cost.breakdown) {
      return [];
    }

    return cost.breakdown
      .filter(item => item !== null)
      .map(item => ({
        name: item.name,
        cost: item.cost,
        type: item.type,
        display: `${item.name}: ${formatMoney(item.cost, {
          currency: resolveMoneyCurrency(item?.currency, cost?.currency),
        })}`
      }));
  },

  /**
   * Get formatted total cost
   */
  getFormattedTotalCost(cost) {
    if (!cost || !cost.total_cost) {
      return formatMoney(0, { currency: 'USD' });
    }
    return formatMoney(cost.total_cost, {
      currency: resolveMoneyCurrency(cost?.currency),
    });
  },

  /**
   * Check if payment is required for emergency request
   */
  isPaymentRequired(emergencyRequest) {
    return (
      emergencyRequest.payment_status === 'pending' &&
      emergencyRequest.total_cost > 0
    );
  },

  /**
   * Get payment status display
   */
  getPaymentStatusDisplay(status) {
    const statusMap = {
      pending: { label: 'Payment Pending', color: '#F59E0B' },
      paid: { label: 'Paid', color: '#10B981' },
      failed: { label: 'Payment Failed', color: '#EF4444' },
      refunded: { label: 'Refunded', color: '#6B7280' }
    };

    return statusMap[status] || { label: 'Unknown', color: '#6B7280' };
  },

  // Mock data methods for development
  getMockServiceCosts() {
    return [
      { id: '1', service_type: 'ambulance', base_cost: 150.00, currency: 'USD', is_active: true },
      { id: '2', service_type: 'consultation', base_cost: 100.00, currency: 'USD', is_active: true },
      { id: '3', service_type: 'bed_booking', base_cost: 200.00, currency: 'USD', is_active: true }
    ];
  },

  getMockCost(serviceType, options = {}) {
    const { distance = 0, isUrgent = false } = options;
    const baseCosts = {
      ambulance: 150.00,
      consultation: 100.00,
      bed_booking: 200.00
    };

    const baseCost = baseCosts[serviceType] || 100.00;
    const distanceSurcharge = distance > 5 ? (distance - 5) * 2.00 : 0;
    const urgencySurcharge = isUrgent ? 25.00 : 0;
    const totalCost = baseCost + distanceSurcharge + urgencySurcharge;

    const breakdown = [
      { name: 'Base Service', cost: baseCost, type: 'base' }
    ];

    if (distanceSurcharge > 0) {
      breakdown.push({ name: 'Distance Surcharge', cost: distanceSurcharge, type: 'distance' });
    }

    if (urgencySurcharge > 0) {
      breakdown.push({ name: 'Urgency Surcharge', cost: urgencySurcharge, type: 'urgency' });
    }

    return {
      base_cost: baseCost,
      distance_surcharge: distanceSurcharge,
      urgency_surcharge: urgencySurcharge,
      total_cost: totalCost,
      breakdown
    };
  }
};
