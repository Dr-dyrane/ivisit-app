import { supabase } from "./supabase";
import { database, StorageKeys } from "../database";
import { MOCK_FAQS } from "../constants/faqs";

const FAQ_TABLE = "support_faqs";
const TICKET_TABLE = "support_tickets";

const buildFallbackFaqId = (faq, index) =>
  faq?.id != null && faq.id !== "" ? String(faq.id) : `faq_${index + 1}`;

const buildFallbackTicketId = () =>
  `support_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// PULLBACK NOTE: Help Support Layer 1 service.
// Owns: canonical server/local normalization, fallback persistence, and realtime wiring.
// Does NOT own: query cache, persisted cross-surface runtime state, or UI lifecycle.

export const normalizeSupportFaq = (faq = {}, index = 0) => ({
  ...faq,
  id:
    faq?.id != null && faq.id !== ""
      ? String(faq.id)
      : buildFallbackFaqId(faq, index),
  question: typeof faq?.question === "string" ? faq.question.trim() : "",
  answer: typeof faq?.answer === "string" ? faq.answer.trim() : "",
  category: typeof faq?.category === "string" ? faq.category.trim() : null,
  rank: Number.isFinite(Number(faq?.rank)) ? Number(faq.rank) : index,
});

export const normalizeSupportFaqList = (faqs) =>
  (Array.isArray(faqs) ? faqs : [])
    .map((faq, index) => normalizeSupportFaq(faq, index))
    .sort((left, right) => left.rank - right.rank);

export const normalizeSupportTicket = (ticket = {}) => ({
  ...ticket,
  id:
    ticket?.id != null && ticket.id !== ""
      ? String(ticket.id)
      : buildFallbackTicketId(),
  userId:
    ticket?.userId != null && ticket.userId !== ""
      ? String(ticket.userId)
      : ticket?.user_id != null && ticket.user_id !== ""
        ? String(ticket.user_id)
        : null,
  subject: typeof ticket?.subject === "string" ? ticket.subject.trim() : "",
  message: typeof ticket?.message === "string" ? ticket.message.trim() : "",
  status:
    typeof ticket?.status === "string"
      ? ticket.status.trim().toLowerCase()
      : "open",
  adminResponse:
    typeof ticket?.adminResponse === "string"
      ? ticket.adminResponse.trim()
      : typeof ticket?.admin_response === "string"
        ? ticket.admin_response.trim()
        : null,
  createdAt:
    ticket?.createdAt || ticket?.created_at || new Date().toISOString(),
  updatedAt:
    ticket?.updatedAt ||
    ticket?.updated_at ||
    ticket?.createdAt ||
    ticket?.created_at ||
    new Date().toISOString(),
});

export const normalizeSupportTicketList = (tickets) =>
  (Array.isArray(tickets) ? tickets : [])
    .map((ticket) => normalizeSupportTicket(ticket))
    .sort((left, right) => {
      const rightTime = new Date(
        right?.updatedAt || right?.createdAt || 0,
      ).getTime();
      const leftTime = new Date(
        left?.updatedAt || left?.createdAt || 0,
      ).getTime();
      return rightTime - leftTime;
    });

const mapTicketFromDb = (row = {}) =>
  normalizeSupportTicket({
    ...row,
    userId: row.user_id,
    adminResponse: row.admin_response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

const mapTicketToDb = (ticket = {}) => ({
  user_id: ticket.userId,
  subject: ticket.subject,
  message: ticket.message,
  status: ticket.status,
  admin_response: ticket.adminResponse,
});

const resolveUserId = async (options = {}) => {
  if (options?.userId) return String(options.userId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ? String(user.id) : null;
};

const requireUserId = async (options = {}) => {
  const userId = await resolveUserId(options);
  if (!userId) {
    throw new Error("AUTH_REQUIRED|User not logged in");
  }
  return userId;
};

async function readLocalTickets(userId = null) {
  const localTickets = await database.read(StorageKeys.SUPPORT_TICKETS, []);
  const normalized = normalizeSupportTicketList(localTickets);
  if (!userId) return normalized;
  return normalized.filter(
    (ticket) => !ticket.userId || String(ticket.userId) === String(userId),
  );
}

async function persistLocalTicket(ticket) {
  const normalized = normalizeSupportTicket(ticket);
  const existing = await database.read(StorageKeys.SUPPORT_TICKETS, []);
  const next = normalizeSupportTicketList([
    normalized,
    ...(Array.isArray(existing) ? existing : []).filter(
      (entry) => String(entry?.id) !== String(normalized.id),
    ),
  ]);
  await database.write(StorageKeys.SUPPORT_TICKETS, next);
  return normalized;
}

export const helpSupportService = {
  async listFAQs() {
    try {
      const { data, error } = await supabase
        .from(FAQ_TABLE)
        .select("*")
        .order("rank", { ascending: true });

      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) {
        return normalizeSupportFaqList(MOCK_FAQS);
      }

      return normalizeSupportFaqList(data);
    } catch (_error) {
      return normalizeSupportFaqList(MOCK_FAQS);
    }
  },

  async listMyTickets(options = {}) {
    const userId = await resolveUserId(options);
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from(TICKET_TABLE)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return normalizeSupportTicketList((data || []).map(mapTicketFromDb));
    } catch (_error) {
      return readLocalTickets(userId);
    }
  },

  async createTicket({ subject, message, userId }) {
    const resolvedUserId = await requireUserId({ userId });
    const payload = normalizeSupportTicket({
      userId: resolvedUserId,
      subject: subject || "Support request",
      message: message || "",
      status: "open",
      adminResponse: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      const { data, error } = await supabase
        .from(TICKET_TABLE)
        .insert(mapTicketToDb(payload))
        .select("*")
        .single();

      if (error) throw error;
      return mapTicketFromDb(data);
    } catch (_error) {
      return persistLocalTicket(payload);
    }
  },

  subscribe(userId, onEvent) {
    if (!userId || typeof onEvent !== "function") {
      return { unsubscribe: () => {} };
    }

    try {
      const channel = supabase
        .channel(`support_tickets_${userId}_${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TICKET_TABLE,
            filter: `user_id=eq.${userId}`,
          },
          onEvent,
        )
        .subscribe();

      return {
        unsubscribe: () => {
          supabase.removeChannel(channel);
        },
      };
    } catch (_error) {
      return { unsubscribe: () => {} };
    }
  },
};

export default helpSupportService;
