/**
 * Pricing Service (Dyrane Canon)
 * Handles Hierarchy-based Pricing: Entity Override (Org) -> Admin Standard
 * Standardizes selection & confirmed costs for Emergency Requests.
 */

import { supabase } from './supabase';

/**
 * Get the effective price for a service after hierarchy resolution
 * @param {string} type - 'bed' or 'ambulance'
 * @param {Object} options - { hospitalId, ambulanceId }
 */
export async function getEffectivePrice(type, { hospitalId = null, ambulanceId = null } = {}) {
  try {
    let overridePrice = null;

    // 1. Check for Entity Overrides (Higher Priority)
    if (type === 'ambulance' && ambulanceId) {
      const { data: amb } = await supabase
        .from('ambulances')
        .select('base_price')
        .eq('id', ambulanceId)
        .single();
      overridePrice = amb?.base_price;
    }

    if (!overridePrice && hospitalId) {
      const { data: hosp } = await supabase
        .from('hospitals')
        .select('base_price')
        .eq('id', hospitalId)
        .single();
      overridePrice = hosp?.base_price;
    }

    if (overridePrice) {
      return {
        base_price: parseFloat(overridePrice),
        currency: 'USD',
        source: 'entity_override'
      };
    }

    // 2. Fallback to Admin Defaults (service_pricing OR room_pricing)
    if (type === 'bed' || type === 'bed_booking') {
      const { data: roomPrice } = await supabase
        .from('room_pricing')
        .select('price_per_night, currency, room_name')
        .eq('room_type', 'general') // Default to general ward if no specific type
        .limit(1)
        .single();

      if (roomPrice) {
        return {
          base_price: parseFloat(roomPrice.price_per_night),
          currency: roomPrice.currency || 'USD',
          source: 'admin_default_room',
          service_name: roomPrice.room_name
        };
      }
    } else {
      const { data: adminPrice } = await supabase
        .from('service_pricing')
        .select('base_price, currency, service_name')
        .eq('service_type', type)
        .limit(1)
        .single();

      if (adminPrice) {
        return {
          base_price: parseFloat(adminPrice.base_price),
          currency: adminPrice.currency || 'USD',
          source: 'admin_default',
          service_name: adminPrice.service_name
        };
      }
    }

    // 3. Final Hardcoded Fallbacks (Safety Net)
    const fallbacks = {
      'ambulance': 150.00,
      'bed': 200.00
    };

    return {
      base_price: fallbacks[type] || 100.00,
      currency: 'USD',
      source: 'hardcoded_fallback'
    };
  } catch (error) {
    console.error('[pricingService] Error fetching effective price:', error);
    return { base_price: 150.00, currency: 'USD', source: 'error_fallback' };
  }
}

/**
 * Calculate total emergency cost for a request
 * @param {Object} requestData - { hospital_id, ambulance_id, service_type, room_id }
 */
export async function calculateEmergencyCost(requestData) {
  const { hospital_id, ambulance_id, service_type, room_id = null } = requestData;
  let totalCost = 0;
  const breakdown = [];

  // Use the RPC for more robust calculation
  try {
    const { data, error } = await supabase.rpc('calculate_emergency_cost', {
      p_service_type: service_type,
      p_hospital_id: hospital_id,
      p_ambulance_id: ambulance_id,
      p_room_id: room_id
    });

    if (error) throw error;
    const cost = data[0];

    return {
      totalCost: parseFloat(cost.total_cost),
      breakdown: cost.breakdown,
      currency: 'USD',
      base_cost: parseFloat(cost.base_cost),
      distance_surcharge: parseFloat(cost.distance_surcharge),
      urgency_surcharge: parseFloat(cost.urgency_surcharge)
    };
  } catch (err) {
    console.error('[pricingService] Error calculating cost via RPC:', err);
    // Fallback to simpler logic or mocks
    const priceObj = await getEffectivePrice(service_type, {
      hospitalId: hospital_id,
      ambulanceId: ambulance_id
    });

    totalCost = priceObj.base_price;
    breakdown.push({
      name: service_type === 'ambulance' ? 'Emergency Ride' : 'Bed Reservation',
      price: priceObj.base_price,
      source: priceObj.source
    });

    return {
      totalCost,
      breakdown,
      currency: priceObj.currency
    };
  }
}

/**
 * Legacy Support: Insurance Coverage Check
 * Kept for clinical history context as requested by User.
 */
export async function checkInsuranceCoverage(userId, totalCost) {
  try {
    const { data: policy, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (error || !policy) return { userCost: totalCost, insuranceCoverage: 0, hasInsurance: false };

    const coverage = policy.coverage_details || {};
    const limit = coverage.limit || 50000;

    let insurancePart = Math.min(totalCost, limit);
    let userPart = Math.max(0, totalCost - limit);

    return {
      userCost: userPart,
      insuranceCoverage: insurancePart,
      hasInsurance: true,
      policyName: policy.provider_name
    };
  } catch (error) {
    return { userCost: totalCost, insuranceCoverage: 0, hasInsurance: false };
  }
}
