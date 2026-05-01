export const selectHelpSupportFaqs = (state) =>
  Array.isArray(state?.faqs) ? state.faqs : [];

export const selectHelpSupportTickets = (state) =>
  Array.isArray(state?.tickets) ? state.tickets : [];

export const selectOpenSupportTickets = (state) =>
  selectHelpSupportTickets(state).filter(
    (ticket) => String(ticket?.status || "").toLowerCase() === "open",
  );

export const selectResolvedSupportTickets = (state) =>
  selectHelpSupportTickets(state).filter((ticket) =>
    ["resolved", "closed"].includes(String(ticket?.status || "").toLowerCase()),
  );

export const selectLatestSupportTicket = (state) =>
  selectHelpSupportTickets(state)[0] || null;

export const selectHelpSupportReady = (state) => state?.isReady === true;
