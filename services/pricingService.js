/**
 * Pricing Service (Dyrane Canon)
 * Handles Hierarchy-based Pricing: Entity Override (Org) -> Admin Standard
 * Standardizes selection & confirmed costs for Emergency Requests.
 */

import { supabase } from './supabase';
import { paymentService } from './paymentService';

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const looksLikeFeeItem = (item) => {
  const type = String(item?.type || '').toLowerCase();
  const name = String(item?.name || '').toLowerCase();
  return type === 'fee' || name.includes('fee');
};

const buildEmergencyBreakdown = (cost, serviceType) => {
  if (Array.isArray(cost?.breakdown) && cost.breakdown.length > 0) {
    return cost.breakdown
      .map((item) => {
        const itemCost = toFiniteNumber(item?.cost ?? item?.price);
        if (itemCost == null) return null;
        return {
          name: item?.name || 'Charge',
          cost: itemCost,
          type: item?.type || 'service',
        };
      })
      .filter(Boolean);
  }

  const baseCost = toFiniteNumber(cost?.base_cost ?? cost?.baseCost);
  const distanceSurcharge = toFiniteNumber(cost?.distance_surcharge ?? cost?.distanceSurcharge);
  const urgencySurcharge = toFiniteNumber(cost?.urgency_surcharge ?? cost?.urgencySurcharge);
  const breakdown = [];

  if (baseCost != null && baseCost > 0) {
    breakdown.push({
      name: serviceType === 'ambulance' ? 'Emergency Ride' : 'Bed Reservation',
      cost: baseCost,
      type: 'base',
    });
  }

  if (distanceSurcharge != null && distanceSurcharge > 0) {
    breakdown.push({
      name: 'Distance Surcharge',
      cost: distanceSurcharge,
      type: 'distance',
    });
  }

  if (urgencySurcharge != null && urgencySurcharge > 0) {
    breakdown.push({
      name: 'Urgency Surcharge',
      cost: urgencySurcharge,
      type: 'urgency',
    });
  }

  return breakdown;
};

export async function augmentEmergencyCostForCheckout(
  rawCost,
  {
    hospitalId = null,
    serviceType = 'ambulance',
    orgFee = null,
  } = {}
) {
  if (!rawCost || typeof rawCost !== 'object') {
    return rawCost;
  }

  const breakdown = buildEmergencyBreakdown(rawCost, serviceType);
  const existingFeeFromBreakdown = breakdown.reduce((sum, item) => {
    if (!looksLikeFeeItem(item)) return sum;
    return sum + Number(item.cost || 0);
  }, 0);

  const existingFee =
    toFiniteNumber(
      rawCost.service_fee ??
      rawCost.feeAmount ??
      rawCost.fee_amount ??
      rawCost.ivisit_fee_amount
    ) ??
    (existingFeeFromBreakdown > 0 ? Number(existingFeeFromBreakdown.toFixed(2)) : null);

  const rawTotal =
    toFiniteNumber(rawCost.totalCost ?? rawCost.total_cost ?? rawCost.total_amount);
  const baseCost = toFiniteNumber(rawCost.base_cost ?? rawCost.baseCost);
  const subtotal =
    (() => {
      if (rawTotal != null && existingFee != null) {
        return Number(Math.max(0, rawTotal - existingFee).toFixed(2));
      }
      if (rawTotal != null) return rawTotal;
      const nonFeeBreakdownSum = breakdown.reduce((sum, item) => {
        if (looksLikeFeeItem(item)) return sum;
        return sum + Number(item.cost || 0);
      }, 0);
      if (nonFeeBreakdownSum > 0) return Number(nonFeeBreakdownSum.toFixed(2));
      if (baseCost != null) return baseCost;
      return null;
    })();

  const resolvedOrgFee =
    orgFee || (hospitalId ? await paymentService.getOrganizationFee(hospitalId) : null);
  const feeRate = toFiniteNumber(resolvedOrgFee?.feePercentage);

  let feeAmount = existingFee;
  if (feeAmount == null && feeRate != null && feeRate > 0) {
    const feeBase = baseCost != null && baseCost > 0 ? baseCost : subtotal;
    if (feeBase != null) {
      feeAmount = Number((feeBase * (feeRate / 100)).toFixed(2));
    }
  }

  const hasFeeRow = breakdown.some((item) => looksLikeFeeItem(item));
  if (!hasFeeRow && feeAmount != null && feeAmount > 0) {
    breakdown.push({
      name: feeRate != null ? `Service Fee (${feeRate}%)` : 'Service Fee',
      cost: feeAmount,
      type: 'fee',
    });
  }

  const grossTotal =
    (() => {
      if (rawTotal != null && existingFee != null) {
        return rawTotal;
      }
      if (subtotal != null) {
        return Number((subtotal + (feeAmount || 0)).toFixed(2));
      }
      return rawTotal;
    })();

  return {
    ...rawCost,
    breakdown,
    orgFee: resolvedOrgFee,
    subtotal,
    feeAmount,
    fee_amount: feeAmount,
    service_fee: feeAmount,
    grossTotal,
    totalCost: grossTotal ?? rawCost.totalCost ?? rawCost.total_cost ?? null,
    total_cost: grossTotal ?? rawCost.total_cost ?? rawCost.totalCost ?? null,
  };
}

/**
 * Get the effective price for a service after hierarchy resolution
 * @param {string} type - 'bed' or 'ambulance'
 * @param {Object} options - { hospitalId, ambulanceId }
 */
export async function getEffectivePrice(type, { hospitalId = null, ambulanceId = null } = {}) {
  try {
    let overridePrice = null;
    let hospitalServicePrice = null;
    let hospitalBasePrice = null;
    let adminDefaultPrice = null;

    // 1. Check for Entity Overrides (Higher Priority)
    if (type === 'ambulance' && ambulanceId) {
      const { data: amb } = await supabase
        .from('ambulances')
        .select('base_price')
        .eq('id', ambulanceId)
        .single();
      overridePrice = amb?.base_price;
    }

    if (overridePrice) {
      return {
        base_price: parseFloat(overridePrice),
        currency: 'USD',
        source: 'entity_override'
      };
    }

    // 2. Hospital-specific pricing rows (org/hospital managed pricing DB)
    if (hospitalId) {
      if (type === 'bed' || type === 'bed_booking') {
        const { data: hospitalRoomPrice } = await supabase
          .from('room_pricing')
          .select('price_per_night, room_name')
          .eq('hospital_id', hospitalId)
          .eq('room_type', 'general')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        hospitalServicePrice = hospitalRoomPrice
          ? {
            base_price: parseFloat(hospitalRoomPrice.price_per_night),
            currency: 'USD',
            source: 'hospital_room_pricing',
            service_name: hospitalRoomPrice.room_name
          }
          : null;
      } else {
        const { data: hospitalSp } = await supabase
          .from('service_pricing')
          .select('base_price, service_name')
          .eq('hospital_id', hospitalId)
          .eq('service_type', type)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        hospitalServicePrice = hospitalSp
          ? {
            base_price: parseFloat(hospitalSp.base_price),
            currency: 'USD',
            source: 'hospital_service_pricing',
            service_name: hospitalSp.service_name
          }
          : null;
      }

      const { data: hosp } = await supabase
        .from('hospitals')
        .select('base_price')
        .eq('id', hospitalId)
        .maybeSingle();
      hospitalBasePrice = hosp?.base_price != null
        ? {
          base_price: parseFloat(hosp.base_price),
          currency: 'USD',
          source: 'hospital_base_price'
        }
        : null;
    }

    if (hospitalServicePrice?.base_price > 0) {
      return hospitalServicePrice;
    }

    if (hospitalBasePrice?.base_price > 0) {
      return hospitalBasePrice;
    }

    // 3. Admin defaults (global pricing rows with hospital_id IS NULL)
    if (type === 'bed' || type === 'bed_booking') {
      const { data: roomPrice } = await supabase
        .from('room_pricing')
        .select('price_per_night, room_name')
        .is('hospital_id', null)
        .eq('room_type', 'general') // Default to general ward if no specific type
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roomPrice) {
        adminDefaultPrice = {
          base_price: parseFloat(roomPrice.price_per_night),
          currency: 'USD',
          source: 'admin_default_room',
          service_name: roomPrice.room_name
        };
      }
    } else {
      const { data: adminPrice } = await supabase
        .from('service_pricing')
        .select('base_price, service_name')
        .is('hospital_id', null)
        .eq('service_type', type)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (adminPrice) {
        adminDefaultPrice = {
          base_price: parseFloat(adminPrice.base_price),
          currency: 'USD',
          source: 'admin_default',
          service_name: adminPrice.service_name
        };
      }
    }

    if (adminDefaultPrice?.base_price > 0) {
      return adminDefaultPrice;
    }

    // 4. Final Hardcoded Fallbacks (Safety Net)
    const fallbacks = {
      'ambulance': 150.00,
      'bed': 200.00,
      'bed_booking': 200.00
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
 * @param {Object} requestData - { hospital_id, ambulance_id, service_type, room_id, distance, is_urgent }
 */
export async function calculateEmergencyCost(requestData) {
  const { hospital_id, ambulance_id, service_type, room_id = null, distance = 0, is_urgent = false } = requestData;
  let totalCost = 0;
  const breakdown = [];

  // Use the RPC for more robust calculation
  try {
    const ambulanceType =
      typeof ambulance_id === 'string' && !/^[0-9a-f]{8}-/i.test(ambulance_id)
        ? ambulance_id
        : null;

    const { data, error } = await supabase.rpc('calculate_emergency_cost_v2', {
      p_service_type: service_type,
      p_hospital_id: hospital_id,
      p_ambulance_type: ambulanceType,
      p_distance_km: Number(distance) || 0
    });

    if (error) throw error;
    const cost = Array.isArray(data) ? data[0] : data;
    if (!cost) {
      throw new Error('Empty pricing response');
    }

    const baseCost = Number(cost.base_cost ?? 0);
    const distanceSurcharge = Number(cost.distance_surcharge ?? 0);
    const urgencySurcharge = Number(cost.urgency_surcharge ?? 0);
    const serviceFee = Number(cost.service_fee ?? 0);
    const total = Number(cost.total_cost ?? (baseCost + distanceSurcharge + urgencySurcharge + serviceFee));
    const breakdown = Array.isArray(cost.breakdown) ? cost.breakdown : [
      {
        name: service_type === 'ambulance' ? 'Emergency Ride' : 'Bed Reservation',
        cost: baseCost,
        type: 'base'
      },
      ...(distanceSurcharge > 0 ? [{ name: 'Distance Surcharge', cost: distanceSurcharge, type: 'distance' }] : []),
      ...(urgencySurcharge > 0 ? [{ name: 'Urgency Surcharge', cost: urgencySurcharge, type: 'urgency' }] : []),
      ...(serviceFee > 0 ? [{ name: 'Service Fee', cost: serviceFee, type: 'fee' }] : []),
    ];

    return {
      totalCost: total,
      total_cost: total,
      breakdown,
      currency: cost.currency || 'USD',
      base_cost: baseCost,
      distance_surcharge: distanceSurcharge,
      urgency_surcharge: urgencySurcharge,
      service_fee: serviceFee
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
