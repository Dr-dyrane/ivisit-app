/**
 * Pricing Service
 * Handles service and room pricing for Uber-style hospital platform
 * Integrates with Gumroad for payment processing
 */

import { supabase } from '../lib/supabase';

const TABLES = {
  service_pricing: 'service_pricing',
  room_pricing: 'room_pricing',
  payment_transactions: 'payment_transactions'
};

/**
 * Get service pricing by type and hospital
 */
export async function getServicePrice(serviceType, hospitalId = null) {
  try {
    const { data, error } = await supabase
      .rpc('get_service_price', {
        service_type_param: serviceType,
        hospital_id_param: hospitalId
      });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching service price:', error);
    throw error;
  }
}

/**
 * Get room pricing by type and hospital
 */
export async function getRoomPrice(roomType, hospitalId = null) {
  try {
    const { data, error } = await supabase
      .rpc('get_room_price', {
        room_type_param: roomType,
        hospital_id_param: hospitalId
      });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching room price:', error);
    throw error;
  }
}

/**
 * Get all service pricing (for admin)
 */
export async function getAllServicePricing(hospitalId = null) {
  try {
    let query = supabase
      .from(TABLES.service_pricing)
      .select('*')
      .eq('is_active', true);

    if (hospitalId) {
      query = query.eq('hospital_id', hospitalId);
    }

    const { data, error } = await query.order('service_type, service_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching service pricing:', error);
    throw error;
  }
}

/**
 * Get all room pricing (for admin)
 */
export async function getAllRoomPricing(hospitalId = null) {
  try {
    let query = supabase
      .from(TABLES.room_pricing)
      .select('*')
      .eq('is_active', true);

    if (hospitalId) {
      query = query.eq('hospital_id', hospitalId);
    }

    const { data, error } = await query.order('room_type, room_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching room pricing:', error);
    throw error;
  }
}

/**
 * Update service pricing (for hospital admin)
 */
export async function updateServicePrice(pricingId, updates) {
  try {
    const { data, error } = await supabase
      .from(TABLES.service_pricing)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', pricingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating service price:', error);
    throw error;
  }
}

/**
 * Update room pricing (for hospital admin)
 */
export async function updateRoomPrice(pricingId, updates) {
  try {
    const { data, error } = await supabase
      .from(TABLES.room_pricing)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', pricingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating room price:', error);
    throw error;
  }
}

/**
 * Create Gumroad payment link
 * This would integrate with Gumroad API
 */
export async function createGumroadPayment(paymentData) {
  try {
    const {
      emergencyRequestId,
      userId,
      hospitalId,
      amount,
      currency = 'USD',
      description
    } = paymentData;

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from(TABLES.payment_transactions)
      .insert({
        emergency_request_id: emergencyRequestId,
        user_id: userId,
        hospital_id: hospitalId,
        amount,
        currency,
        status: 'pending'
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // In a real implementation, you would call Gumroad API here
    // For now, return a mock payment URL
    const gumroadUrl = `https://gumroad.com/l/ivisit-emergency?price=${amount}&name=${encodeURIComponent(description || 'Emergency Service')}&wanted=true`;

    return {
      transaction,
      paymentUrl: gumroadUrl
    };
  } catch (error) {
    console.error('Error creating Gumroad payment:', error);
    throw error;
  }
}

/**
 * Update payment transaction status (webhook from Gumroad)
 */
export async function updatePaymentStatus(transactionId, status, gumroadData = {}) {
  try {
    const { data, error } = await supabase
      .from(TABLES.payment_transactions)
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...gumroadData
      })
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

/**
 * Get user payment history
 */
export async function getUserPaymentHistory(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from(TABLES.payment_transactions)
      .select(`
        *,
        emergency_requests (
          service_type,
          hospital_name,
          created_at
        ),
        hospitals (
          name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
}

/**
 * Get hospital payment analytics
 */
export async function getHospitalPaymentAnalytics(hospitalId, startDate = null, endDate = null) {
  try {
    let query = supabase
      .from(TABLES.payment_transactions)
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate analytics
    const totalRevenue = data.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
    const transactionCount = data.length;
    const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    return {
      transactions: data,
      analytics: {
        totalRevenue,
        transactionCount,
        averageTransaction,
        period: {
          startDate,
          endDate
        }
      }
    };
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    throw error;
  }
}

/**
 * Calculate emergency service cost
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
        totalCost += parseFloat(ambulancePrice.price);
        costBreakdown.push({
          type: 'Ambulance Service',
          name: ambulancePrice.service_name,
          price: parseFloat(ambulancePrice.price)
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
          name: bedPrice.room_name,
          price: parseFloat(bedPrice.price)
        });
      }
    }

    // Add consultation cost
    const consultationPrice = await getServicePrice('consultation', hospital_id);
    if (consultationPrice) {
      totalCost += parseFloat(consultationPrice.price);
      costBreakdown.push({
        type: 'Consultation',
        name: consultationPrice.service_name,
        price: parseFloat(consultationPrice.price)
      });
    }

    return {
      totalCost,
      costBreakdown,
      currency: 'USD'
    };
  } catch (error) {
    console.error('Error calculating emergency cost:', error);
    throw error;
  }
}
