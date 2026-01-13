import { supabase } from "./supabase";
import { database, StorageKeys } from "../database";
import { MOCK_FAQS } from "../constants/faqs";

export const helpSupportService = {
  async listFAQs() {
    try {
      const { data, error } = await supabase
        .from("support_faqs")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      
      // If no FAQs found in DB, use mock data
      if (!data || data.length === 0) {
        throw new Error("No FAQs found");
      }
      
      return data;
    } catch (err) {
      // Premium fallback content for offline/error states
      return MOCK_FAQS.map((faq, index) => ({
        ...faq,
        id: index + 1
      }));
    }
  },

  async createTicket({ subject, message }) {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      user_id: user?.id ?? null,
      subject: subject ?? "Support Request",
      message: message ?? "",
      status: "open",
    };
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      const local = await database.append(StorageKeys.SUPPORT_TICKETS, {
        id: `local_${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      });
      return local;
    }
  },

  async listMyTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    try {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      const local = await database.read(StorageKeys.SUPPORT_TICKETS, []);
      return Array.isArray(local) ? local : [];
    }
  }
};
