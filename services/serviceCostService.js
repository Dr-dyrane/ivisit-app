/**
 * Service Cost Service
 * Handles cost calculation for emergency services and links to payment system
 */

import { supabase } from './supabase';

export const serviceCostService = {
  /**
   * Get service costs configuration
   */
  async getServiceCosts() {
    try {
      const { data, error } = await supabase
        .from('service_costs')
        .select('*')
        .eq('is_active', true);

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
      const { distance = 0, isUrgent = false } = options;
      
      // Call the database function
      const { data, error } = await supabase
        .rpc('calculate_emergency_cost', {
          p_service_type: serviceType,
          p_distance: distance,
          p_is_urgent: isUrgent
        });

      if (error) throw error;
      
      return data[0];
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
      const { data, error } = await supabase
        .from('emergency_requests')
        .update({
          payment_status: paymentData.status,
          payment_id: paymentData.paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', emergencyRequestId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
          isUrgent: requestData.is_urgent || false
        }
      );

      // Create emergency request with cost information
      const emergencyData = {
        ...requestData,
        base_cost: cost.base_cost,
        distance_surcharge: cost.distance_surcharge,
        urgency_surcharge: cost.urgency_surcharge,
        total_cost: cost.total_cost,
        cost_breakdown: cost.breakdown,
        payment_status: 'pending'
      };

      const { data, error } = await supabase
        .from('emergency_requests')
        .insert(emergencyData)
        .select()
        .single();

      if (error) throw error;
      return data;
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
        display: `${item.name}: $${item.cost.toFixed(2)}`
      }));
  },

  /**
   * Get formatted total cost
   */
  getFormattedTotalCost(cost) {
    if (!cost || !cost.total_cost) {
      return '$0.00';
    }
    return `$${cost.total_cost.toFixed(2)}`;
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
