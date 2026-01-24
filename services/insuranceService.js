import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { notificationDispatcher } from "./notificationDispatcher";

export const insuranceService = {
    /**
     * Get all insurance policies for the current user
     */
    async list() {
        // Try local cache first to ensure offline-first
        const local = await database.read(StorageKeys.INSURANCE_POLICIES, []);

        // Then try fetching fresh data
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return local; // Fallback to local if no session

        // Try Supabase first
        const { data, error } = await supabase
            .from('insurance_policies')
            .select('*')
            .eq('user_id', session.user.id)
            .order('is_default', { ascending: false }) // Default first
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Cache locally
            await database.write(StorageKeys.INSURANCE_POLICIES, data);
            return data;
        }

        return local;
    },

    async getPolicies() {
        return this.list();
    },

    /**
     * Create a new policy (or auto-enroll)
     */
    async create(policy) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Check if this is the first policy, if so make it default
        const { count } = await supabase
            .from('insurance_policies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        const isFirst = count === 0;

        const newPolicy = {
            user_id: user.id,
            provider_name: policy.provider_name || 'iVisit Basic',
            policy_number: policy.policy_number || `IV-${Date.now().toString().slice(-6)}`,
            group_number: policy.group_number || null,
            policy_holder_name: policy.policy_holder_name || null,
            plan_type: policy.plan_type || 'basic',
            status: 'active',
            coverage_details: policy.coverage_details || { limit: 50000, type: 'emergency_transport' },
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            is_default: isFirst, // Auto-default if first
        };

        const { data, error } = await supabase
            .from('insurance_policies')
            .insert(newPolicy)
            .select()
            .single();

        if (error) {
            console.error("Failed to create insurance policy:", error);
            throw error;
        }

        try {
            await notificationDispatcher.dispatchInsuranceUpdate('created', data);
        } catch (e) {
            console.warn("Failed to dispatch insurance notification:", e);
        }

        return data;
    },

    // Alias
    async createPolicy(policy) {
        return this.create({
            provider_name: policy.providerName,
            policy_number: policy.policyNumber,
            plan_type: policy.planType,
            coverage_details: policy.coverageDetails
        });
    },

    async update(id, updates) {
        const { error, data } = await supabase
            .from('insurance_policies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id) {
        // 1. Check if default
        const { data: policy } = await supabase
            .from('insurance_policies')
            .select('is_default')
            .eq('id', id)
            .single();

        if (policy?.is_default) {
            // Check if there are other policies
            const { count } = await supabase
                .from('insurance_policies')
                .select('*', { count: 'exact', head: true });

            if (count > 1) {
                throw new Error("Cannot delete default policy. Please set another policy as default first.");
            } else {
                throw new Error("Cannot delete your only insurance policy. You must have at least one active scheme.");
            }
        }

        const { error } = await supabase
            .from('insurance_policies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Set a policy as default
     */
    async setDefault(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Transaction-like approach (Supabase doesn't support easy transactions via JS client without RPC)
        // 1. Unset all defaults for user
        await supabase
            .from('insurance_policies')
            .update({ is_default: false })
            .eq('user_id', user.id);

        // 2. Set new default
        const { data, error } = await supabase
            .from('insurance_policies')
            .update({ is_default: true })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Link payment method to policy
     */
    async linkPaymentMethod(id, paymentMethod) {
        // paymentMethod: { type: 'card', last4: '1234', brand: 'Visa' }
        const { data, error } = await supabase
            .from('insurance_policies')
            .update({ linked_payment_method: paymentMethod })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Auto-enroll user in basic scheme
     */
    async enrollBasicScheme() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Check if already enrolled
        const { data: existing } = await supabase
            .from('insurance_policies')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider_name', 'iVisit Basic')
            .limit(1);

        if (existing && existing.length > 0) {
            return existing[0];
        }

        return this.create({
            provider_name: 'iVisit Basic',
            plan_type: 'basic',
            coverage_details: {
                limit: 50000,
                description: 'Covers 1 emergency ambulance trip per year',
                copay: 0
            }
        });
    },

    /**
     * Upload insurance card image
     * @param {string} uri - Local file URI from ImagePicker
     * @returns {Promise<string>} - Public URL of uploaded image
     */
    async uploadImage(uri) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            const ext = uri.substring(uri.lastIndexOf('.') + 1);
            const fileName = `insurance/${user.id}/${Date.now()}.${ext}`;

            // Read file as Base64 for Supabase Upload (React Native standard)
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const { data, error } = await supabase.storage
                .from('documents')
                .upload(fileName, decode(base64), {
                    contentType: `image/${ext}`,
                    upsert: false
                });

            if (error) throw error;

            // Generate signed URL (NOT public for private bucket)
            const { data: signedData, error: signedError } = await supabase.storage
                .from('documents')
                .createSignedUrl(fileName, 60 * 60); // 1 hour

            if (signedError) throw signedError;

            return signedData.signedUrl;
        } catch (error) {
            console.error("Error uploading insurance image:", error);
            throw error;
        }
    }
};
