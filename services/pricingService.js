/**
 * Pricing Service
 * Handles B2B pricing for hospitals (not user-facing)
 * Users get free service via insurance scheme
 * Hospitals get paid via insurance partnerships
 */

import { supabase } from './supabase';

const TABLES = {
  service_pricing: 'service_pricing',
  room_pricing: 'room_pricing',
  insurance_billing: 'insurance_billing'
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
export async function calculateEmergencyCost(emergencyRequest) {
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
 * Check user insurance coverage for emergency
 * Returns what insurance covers vs what user might pay
 */
export async function checkInsuranceCoverage(userId, emergencyRequest) {
  try {
    // Get user's active insurance policy
    const { data: policies, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error || !policies) {
      // No insurance - return full cost (though this shouldn't happen in our model)
      const cost = await calculateEmergencyCost(emergencyRequest);
      return {
        userCost: cost.totalCost,
        insuranceCoverage: 0,
        totalCost: cost.totalCost,
        coveragePercentage: 0,
        hasInsurance: false
      };
    }

    // Calculate insurance coverage
    const cost = await calculateEmergencyCost(emergencyRequest);
    const coveragePercentage = policies.coverage_percentage || 80; // Default 80% coverage
    const insuranceCoverage = (cost.totalCost * coveragePercentage) / 100;
    const userCost = cost.totalCost - insuranceCoverage;

    return {
      userCost,
      insuranceCoverage,
      totalCost: cost.totalCost,
      coveragePercentage,
      hasInsurance: true,
      policyName: policies.provider_name,
      costBreakdown: cost.costBreakdown
    };
  } catch (error) {
    console.error('Error checking insurance coverage:', error);
    throw error;
  }
}

/**
 * Create insurance billing record
 * This creates the billing record for hospital-to-insurance payment
 */
export async function createInsuranceBilling(emergencyRequestId, hospitalId, totalCost, insuranceCoverage) {
  try {
    const { data, error } = await supabase
      .from('insurance_billing')
      .insert({
        emergency_request_id: emergencyRequestId,
        hospital_id: hospitalId,
        total_amount: totalCost,
        insurance_amount: insuranceCoverage,
        hospital_amount: totalCost - insuranceCoverage,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating insurance billing:', error);
    throw error;
  }
}

/**
 * Get hospital billing analytics
 * For hospital administrators to see their insurance payments
 */
export async function getHospitalBillingAnalytics(hospitalId, startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('insurance_billing')
      .select('*')
      .eq('hospital_id', hospitalId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate analytics
    const totalBilled = data.reduce((sum, record) => sum + parseFloat(record.total_amount), 0);
    const totalInsurance = data.reduce((sum, record) => sum + parseFloat(record.insurance_amount), 0);
    const totalHospital = data.reduce((sum, record) => sum + parseFloat(record.hospital_amount), 0);

    return {
      records: data,
      analytics: {
        totalBilled,
        totalInsurance,
        totalHospital,
        averagePerClaim: data.length > 0 ? totalBilled / data.length : 0,
        totalClaims: data.length,
        insuranceCoveragePercentage: totalBilled > 0 ? (totalInsurance / totalBilled) * 100 : 0
      }
    };
  } catch (error) {
    console.error('Error fetching billing analytics:', error);
    throw error;
  }
}

// Export for use in emergency requests
export {
  calculateEmergencyCost,
  checkInsuranceCoverage,
  createInsuranceBilling,
  getHospitalBillingAnalytics
};
