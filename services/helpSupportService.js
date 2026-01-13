import { supabase } from "./supabase";
import { database, StorageKeys } from "../database";

export const helpSupportService = {
  async listFAQs() {
    try {
      const { data, error } = await supabase
        .from("support_faqs")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      // Premium fallback content for offline/error states
      return [
        { 
          id: 1, 
          question: "How is my medical data secured?", 
          answer: "We use bank-grade encryption and strict HIPAA-compliant protocols. Your health data is yours; we only share what's necessary with emergency responders during active SOS requests.", 
          category: "Privacy", 
          rank: 1 
        },
        { 
          id: 2, 
          question: "What happens during an SOS request?", 
          answer: "Once confirmed, we instantly broadcast your location and medical profile to the nearest available ambulance and the receiving hospital. You'll track the ambulance in real-time.", 
          category: "Emergency", 
          rank: 2 
        },
        { 
          id: 3, 
          question: "Can I book a bed in advance?", 
          answer: "Yes. Switch to 'Bed Booking' mode in the SOS tab. You can view real-time availability and secure a reservation before you arrive.", 
          category: "Services", 
          rank: 3 
        },
        { 
          id: 4, 
          question: "How do payments work?", 
          answer: "Payments are processed securely via Stripe. You're only charged when a service (ambulance dispatch or bed reservation) is successfully confirmed.", 
          category: "Billing", 
          rank: 4 
        }
      ];
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
