/**
 * Pricing Service
 * Handles B2B pricing for hospitals (not user-facing)
 * Users get free service via existing insurance scheme
 * Hospitals get paid via insurance partnerships
 */

import { supabase } from './supabase';

// Use existing insurance schema - no new tables needed
const EXISTING_TABLES = {
  insurance_policies: 'insurance_policies',
  emergency_requests: 'emergency_requests'
};

/**
 * Get service pricing for hospital billing (B2B)
 * This is for hospital-to-insurance billing, not user payments
 */
export async function getServicePrice(serviceType, hospitalId = null) {
  try {
    // For now, return standard pricing that hospitals bill to insurance
    const standardPricing = {
      'ambulance': { base_price: 150.00, currency: 'USD', description: 'Standard ambulance service' },
      'bed': { base_price: 200.00, currency: 'USD', description: 'Emergency bed booking' },
      'consultation': { base_price: 100.00, currency: 'USD', description: 'Emergency consultation' }
    };

    return standardPricing[serviceType] || null;
  } catch (error) {
    console.error('Error fetching service price:', error);
    throw error;
  }
}

/**
 * Get room pricing for hospital billing (B2B)
 */
export async function getRoomPrice(roomType, hospitalId = null) {
  try {
    // Standard room pricing for insurance billing
    const standardPricing = {
      'general': { price: 150.00, currency: 'USD', description: 'General ward' },
      'private': { price: 300.00, currency: 'USD', description: 'Private room' },
      'icu': { price: 800.00, currency: 'USD', description: 'ICU bed' },
      'emergency': { price: 250.00, currency: 'USD', description: 'Emergency room' }
    };

    return standardPricing[roomType] || null;
  } catch (error) {
    console.error('Error fetching room price:', error);
    throw error;
  }
}

/**
 * Calculate emergency cost for insurance billing
 * This is what hospitals bill to insurance companies
 */
async function calculateEmergencyCost(emergencyRequest) {
  try {
    const { service_type, ambulance_type, bed_type, hospital_id } = emergencyRequest;
    let totalCost = 0;
    const costBreakdown = [];

    // Add ambulance cost if applicable
    if (service_type === 'ambulance' || ambulance_type) {
      const ambulancePrice = await getServicePrice('ambulance', hospital_id);
      if (ambulancePrice) {
        totalCost += parseFloat(ambulancePrice.base_price);
        costBreakdown.push({
          type: 'Ambulance Service',
          name: ambulancePrice.description,
          price: parseFloat(ambulancePrice.base_price)
        });
      }
    }

    // Add bed cost if applicable
    if (service_type === 'bed' || bed_type) {
      const bedPrice = await getRoomPrice(bed_type || 'general', hospital_id);
      if (bedPrice) {
        totalCost += parseFloat(bedPrice.price);
        costBreakdown.push({
          type: 'Room Booking',
          name: bedPrice.description,
          price: parseFloat(bedPrice.price)
        });
      }
    }

    // Add consultation cost
    const consultationPrice = await getServicePrice('consultation', hospital_id);
    if (consultationPrice) {
      totalCost += parseFloat(consultationPrice.base_price);
      costBreakdown.push({
        type: 'Consultation',
        name: consultationPrice.description,
        price: parseFloat(consultationPrice.base_price)
      });
    }

    return {
      totalCost,
      costBreakdown,
      currency: 'USD',
      billingType: 'insurance' // This is billed to insurance, not user
    };
  } catch (error) {
    console.error('Error calculating emergency cost:', error);
    throw error;
  }
}

/**
 * Check user insurance coverage using existing insurance schema
 * Returns what insurance covers based on existing policy
 */
async function checkInsuranceCoverage(userId, emergencyRequest) {
  try {
    // Get user's active insurance policy from existing schema
    const { data: policy, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('status', 'active')
      .single();

    if (error || !policy) {
      // No active insurance - return full cost (though auto-enrollment should prevent this)
      const cost = await calculateEmergencyCost(emergencyRequest);
      return {
        userCost: cost.totalCost,
        insuranceCoverage: 0,
        totalCost: cost.totalCost,
        coveragePercentage: 0,
        hasInsurance: false
      };
    }

    // Parse coverage details from existing JSONB field
    const coverageDetails = policy.coverage_details || {};
    const coverageLimit = coverageDetails.limit || 50000;
    const copay = coverageDetails.copay || 0;
    
    const cost = await calculateEmergencyCost(emergencyRequest);
    
    // Apply insurance coverage based on existing policy
    let insuranceCoverage = cost.totalCost;
    let userCost = 0;
    
    // If cost exceeds limit, user pays the difference
    if (cost.totalCost > coverageLimit) {
      insuranceCoverage = coverageLimit;
      userCost = cost.totalCost - coverageLimit;
    }
    
    // Add copay if applicable
    userCost += copay;

    return {
      userCost,
      insuranceCoverage,
      totalCost: cost.totalCost,
      coveragePercentage: coverageLimit > 0 ? Math.round((insuranceCoverage / cost.totalCost) * 100) : 0,
      hasInsurance: true,
      policyName: policy.provider_name,
      policyType: policy.plan_type,
      policyNumber: policy.policy_number,
      coverageDetails,
      costBreakdown: cost.costBreakdown
    };
  } catch (error) {
    console.error('Error checking insurance coverage:', error);
    throw error;
  }
}

// Export for use in emergency requests
export {
  calculateEmergencyCost,
  checkInsuranceCoverage
};
