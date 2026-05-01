import { useAtom, useAtomValue } from "jotai";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo } from "react";
import { useHelpSupport } from "../../contexts/HelpSupportContext";
import {
  helpSupportCanSubmitAtom,
  helpSupportComposeVisibleAtom,
  helpSupportExpandedFaqIdsAtom,
  helpSupportExpandedTicketIdsAtom,
  helpSupportMessageAtom,
  helpSupportSubjectAtom,
} from "../../atoms/helpSupportAtoms";
import { HELP_SUPPORT_SCREEN_COPY } from "../../components/helpSupport/helpSupport.content";

const OPEN_TICKET_STATES = new Set(["open", "pending"]);

function normalizeRouteTicketId(value) {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function toggleId(list, targetId) {
  const next = Array.isArray(list) ? list : [];
  if (next.includes(targetId)) {
    return next.filter((id) => id !== targetId);
  }
  return [...next, targetId];
}

function formatTicketDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return HELP_SUPPORT_SCREEN_COPY.rows.ticketDateFallback;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function toTicketSection(label, items) {
  return {
    key: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    items,
  };
}

export function useHelpSupportScreenModel() {
  const { ticketId } = useLocalSearchParams();
  const {
    faqs,
    tickets,
    loading,
    isRefreshing,
    error,
    submitTicket,
    refresh,
    retry,
    isSubmitting,
  } = useHelpSupport();

  const [composeVisible, setComposeVisible] = useAtom(
    helpSupportComposeVisibleAtom,
  );
  const [subject, setSubject] = useAtom(helpSupportSubjectAtom);
  const [message, setMessage] = useAtom(helpSupportMessageAtom);
  const [expandedFaqIds, setExpandedFaqIds] = useAtom(
    helpSupportExpandedFaqIdsAtom,
  );
  const [expandedTicketIds, setExpandedTicketIds] = useAtom(
    helpSupportExpandedTicketIdsAtom,
  );
  const canSubmit = useAtomValue(helpSupportCanSubmitAtom);

  const highlightedTicketId = normalizeRouteTicketId(ticketId);

  useEffect(() => {
    if (!highlightedTicketId) return;
    setExpandedTicketIds((current) =>
      current.includes(highlightedTicketId)
        ? current
        : [highlightedTicketId, ...current],
    );
  }, [highlightedTicketId, setExpandedTicketIds]);

  const openTickets = useMemo(
    () =>
      (Array.isArray(tickets) ? tickets : []).filter((ticket) =>
        OPEN_TICKET_STATES.has(String(ticket?.status || "").toLowerCase()),
      ),
    [tickets],
  );
  const resolvedTickets = useMemo(
    () =>
      (Array.isArray(tickets) ? tickets : []).filter(
        (ticket) =>
          !OPEN_TICKET_STATES.has(String(ticket?.status || "").toLowerCase()),
      ),
    [tickets],
  );
  const ticketSections = useMemo(() => {
    const sections = [];
    if (openTickets.length > 0) {
      sections.push(
        toTicketSection(HELP_SUPPORT_SCREEN_COPY.rows.openGroup, openTickets),
      );
    }
    if (resolvedTickets.length > 0) {
      sections.push(
        toTicketSection(
          HELP_SUPPORT_SCREEN_COPY.rows.resolvedGroup,
          resolvedTickets,
        ),
      );
    }
    return sections;
  }, [openTickets, resolvedTickets]);
  const latestTicket = tickets[0] || null;

  const headerSubtitle =
    openTickets.length > 0
      ? `${openTickets.length} open`
      : tickets.length > 0
        ? "Support history"
        : HELP_SUPPORT_SCREEN_COPY.messages.faqReady;

  const openCountLabel =
    openTickets.length === 1
      ? "1 open request"
      : `${openTickets.length} open requests`;
  const answeredCountLabel =
    resolvedTickets.length === 1
      ? "1 answered request"
      : `${resolvedTickets.length} answered requests`;
  const faqCountLabel =
    faqs.length === 1 ? "1 quick answer" : `${faqs.length} quick answers`;

  const latestTicketLabel = latestTicket?.subject
    ? latestTicket.subject
    : HELP_SUPPORT_SCREEN_COPY.island.latestFallback;
  const latestStatusLabel = latestTicket?.adminResponse
    ? HELP_SUPPORT_SCREEN_COPY.rows.response
    : HELP_SUPPORT_SCREEN_COPY.rows.awaitingReply;

  const openComposer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComposeVisible(true);
  }, [setComposeVisible]);

  const hideComposer = useCallback(() => {
    setComposeVisible(false);
  }, [setComposeVisible]);

  const discardComposer = useCallback(() => {
    setSubject("");
    setMessage("");
    setComposeVisible(false);
  }, [setComposeVisible, setMessage, setSubject]);

  const submitComposer = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const createdTicket = await submitTicket({
      subject: subject.trim(),
      message: message.trim(),
    });
    if (createdTicket?.id) {
      setExpandedTicketIds((current) =>
        current.includes(createdTicket.id)
          ? current
          : [createdTicket.id, ...current],
      );
    }
    setSubject("");
    setMessage("");
    setComposeVisible(false);
  }, [
    canSubmit,
    isSubmitting,
    message,
    setComposeVisible,
    setExpandedTicketIds,
    setMessage,
    setSubject,
    subject,
    submitTicket,
  ]);

  const toggleFaq = useCallback(
    (faqId) => {
      if (!faqId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedFaqIds((current) => toggleId(current, faqId));
    },
    [setExpandedFaqIds],
  );

  const toggleTicket = useCallback(
    (ticketEntryId) => {
      if (!ticketEntryId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedTicketIds((current) => toggleId(current, ticketEntryId));
    },
    [setExpandedTicketIds],
  );

  const retrySync = useCallback(async () => {
    retry();
    await refresh();
  }, [refresh, retry]);

  return {
    faqs,
    tickets,
    ticketSections,
    latestTicket,
    loading,
    isRefreshing,
    error,
    composeVisible,
    subject,
    message,
    canSubmit,
    isSubmitting,
    expandedFaqIds: new Set(expandedFaqIds),
    expandedTicketIds: new Set(expandedTicketIds),
    highlightedTicketId,
    headerSubtitle,
    centerTitle: HELP_SUPPORT_SCREEN_COPY.center.title,
    openCountLabel,
    answeredCountLabel,
    faqCountLabel,
    latestTicketLabel,
    latestStatusLabel,
    hasTickets: tickets.length > 0,
    hasFaqs: faqs.length > 0,
    formatTicketDate,
    onRefresh: refresh,
    onRetry: retrySync,
    onOpenComposer: openComposer,
    onHideComposer: hideComposer,
    onDiscardComposer: discardComposer,
    onSubmitComposer: submitComposer,
    onSubjectChange: setSubject,
    onMessageChange: setMessage,
    onToggleFaq: toggleFaq,
    onToggleTicket: toggleTicket,
  };
}

export default useHelpSupportScreenModel;
