import { supabase } from "../supabase";
import { calculateEmergencyCost, checkInsuranceCoverage } from "../pricingService";

/**
 * Subscribe to emergency request updates
 */
export const subscribeToEmergencyUpdates = async (requestId, callback) => {
    const channel = supabase
        .channel(`emergency_${requestId}`)
        .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'emergency_requests',
                filter: `id=eq.${requestId}`
            }, 
            callback
        )
        .subscribe();
    
    return () => supabase.removeChannel(channel);
};

/**
 * Subscribe to ambulance location updates
 */
export const subscribeToAmbulanceLocation = async (requestId, callback) => {
    const channel = supabase
        .channel(`ambulance_location_${requestId}`)
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'ambulances',
                filter: `current_call=eq.${requestId}`
            },
            callback
        )
        .subscribe();
    
    return () => supabase.removeChannel(channel);
};

/**
 * Subscribe to hospital bed updates
 */
export const subscribeToHospitalBeds = async (hospitalId, callback) => {
    const channel = supabase
        .channel(`hospital_beds_${hospitalId}`)
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'hospitals',
                filter: `id=eq.${hospitalId}`
            },
            callback
        )
        .subscribe();
    
    return () => supabase.removeChannel(channel);
};

// PRICING WRAPPERS

export const calculateRequestCost = async (requestId) => {
    try {
        const { data: request, error } = await supabase
            .from('emergency_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error) throw error;

        const costBreakdown = await calculateEmergencyCost(request);
        return costBreakdown;
    } catch (error) {
        console.error('Error calculating request cost:', error);
        throw error;
    }
};

export const checkRequestInsuranceCoverage = async (requestId) => {
    try {
        const { data: request, error } = await supabase
            .from('emergency_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error) throw error;

        const coverage = await checkInsuranceCoverage(request.user_id, request);
        return coverage;
    } catch (error) {
        console.error('Error checking insurance coverage:', error);
        throw error;
    }
};
