import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";

export const insuranceService = {
    /**
     * Get all insurance policies for the current user
     */
    async getPolicies() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Try Supabase first
        const { data, error } = await supabase
            .from('insurance_policies')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Cache locally
            await database.write(StorageKeys.INSURANCE_POLICIES, data);
            return data;
        }

        // Fallback to local
        const local = await database.read(StorageKeys.INSURANCE_POLICIES, []);
        return local;
    },

    /**
     * Create a new policy (or auto-enroll)
     */
    async createPolicy(policy) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const newPolicy = {
            user_id: user.id,
            provider_name: policy.providerName || 'iVisit Basic',
            policy_number: policy.policyNumber || `IV-${Date.now().toString().slice(-6)}`,
            plan_type: policy.planType || 'basic',
            status: 'active',
            coverage_details: policy.coverageDetails || { limit: 50000, type: 'emergency_transport' },
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        };

        const { data, error } = await supabase
            .from('insurance_policies')
            .insert(newPolicy)
            .select()
            .single();

        if (error) {
            console.error("Failed to create insurance policy:", error);
            // Save locally if offline?
            return newPolicy; 
        }

        return data;
    },

    /**
     * Auto-enroll user in basic scheme
     */
    async enrollBasicScheme() {
        return this.createPolicy({
            providerName: 'iVisit Basic',
            planType: 'basic',
            coverageDetails: { 
                limit: 50000, 
                description: 'Covers 1 emergency ambulance trip per year',
                copay: 0
            }
        });
    }
};
