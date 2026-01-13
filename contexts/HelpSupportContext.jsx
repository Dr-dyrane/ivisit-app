import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { helpSupportService } from "../services/helpSupportService";
import { useToast } from "./ToastContext";
import { notificationDispatcher } from "../services/notificationDispatcher";

const HelpSupportContext = createContext();

export function HelpSupportProvider({ children }) {
  const { showToast } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [faqList, myTickets] = await Promise.all([
        helpSupportService.listFAQs(),
        helpSupportService.listMyTickets(),
      ]);
      setFaqs(Array.isArray(faqList) ? faqList : []);
      setTickets(Array.isArray(myTickets) ? myTickets : []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const submitTicket = useCallback(async ({ subject, message }) => {
    try {
      const created = await helpSupportService.createTicket({ subject, message });
      setTickets(prev => [created, ...(Array.isArray(prev) ? prev : [])]);
      
      // Dispatch notification
      await notificationDispatcher.dispatchSupportEvent('ticket_created', created);
      
      showToast("Support request submitted", "success");
      return created;
    } catch (e) {
      showToast("Failed to submit request", "error");
      throw e;
    }
  }, [showToast]);

  const value = useMemo(() => ({
    faqs,
    tickets,
    loading,
    refresh,
    submitTicket,
  }), [faqs, tickets, loading, refresh, submitTicket]);

  return (
    <HelpSupportContext.Provider value={value}>
      {children}
    </HelpSupportContext.Provider>
  );
}

export function useHelpSupport() {
  const ctx = useContext(HelpSupportContext);
  if (!ctx) throw new Error("useHelpSupport must be used within HelpSupportProvider");
  return ctx;
}
