import { supabase } from "./supabase";

const TABLE = "insurance_policies";

export const insuranceService = {
  /**
   * List all insurance policies for the current user
   */
  async list() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[insuranceService] List error:", error);
      throw error;
    }

    return data;
  },

  /**
   * Create a new insurance policy
   */
  async create(policy) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const dbItem = {
      ...policy,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbItem)
      .select()
      .single();

    if (error) {
      console.error("[insuranceService] Create error:", error);
      throw error;
    }

    return data;
  },

  /**
   * Update an existing policy
   */
  async update(id, updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const dbUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE)
      .update(dbUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error(`[insuranceService] Update error for ${id}:`, error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a policy
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not logged in");

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(`[insuranceService] Delete error for ${id}:`, error);
      throw error;
    }

    return true;
  }
};
