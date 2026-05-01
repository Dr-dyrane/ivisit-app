import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  selectHelpSupportFaqs,
  selectHelpSupportReady,
  selectHelpSupportTickets,
} from "../../stores/helpSupportSelectors";
import {
  hydrateHelpSupportStore,
  useHelpSupportStore,
} from "../../stores/helpSupportStore";
import { helpSupportQueryKeys } from "./helpSupport.queryKeys";
import { useSupportFaqsQuery } from "./useSupportFaqsQuery";
import { useSupportTicketMutations } from "./useSupportTicketMutations";
import { useSupportTicketsQuery } from "./useSupportTicketsQuery";
import { useSupportTicketsRealtime } from "./useSupportTicketsRealtime";
import { useHelpSupportLifecycle } from "./useHelpSupportLifecycle";

// PULLBACK NOTE: Help Support compatibility facade.
// OLD: legacy provider owned direct fetch, local draft, and screen lifecycle in one monolith.
// NEW: this hook translates the five-layer support lane into a stable consumer contract.

export function useHelpSupportFacade() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const queryClient = useQueryClient();

  const faqs = useHelpSupportStore(selectHelpSupportFaqs);
  const tickets = useHelpSupportStore(selectHelpSupportTickets);
  const hydrated = useHelpSupportStore((state) => state.hydrated);
  const ownerUserId = useHelpSupportStore((state) => state.ownerUserId);
  const isSyncing = useHelpSupportStore((state) => state.isSyncing);
  const lifecycleError = useHelpSupportStore((state) => state.lifecycleError);
  const hydrateFromServer = useHelpSupportStore(
    (state) => state.hydrateFromServer,
  );
  const setLifecycleStatus = useHelpSupportStore(
    (state) => state.setLifecycleStatus,
  );
  const resetHelpSupportState = useHelpSupportStore(
    (state) => state.resetHelpSupportState,
  );
  const isReady = useHelpSupportStore(selectHelpSupportReady);

  useEffect(() => {
    void hydrateHelpSupportStore();
  }, []);

  const faqsQuery = useSupportFaqsQuery({ enabled: true });
  const ticketsQuery = useSupportTicketsQuery({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId),
  });
  const mutations = useSupportTicketMutations({ userId });

  useSupportTicketsRealtime({
    userId,
    enabled: hydrated && !authLoading && Boolean(userId),
  });

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!userId) {
      resetHelpSupportState(null);
    }
  }, [authLoading, hydrated, resetHelpSupportState, userId]);

  useEffect(() => {
    if (!Array.isArray(faqsQuery.data)) return;
    hydrateFromServer({ faqs: faqsQuery.data }, userId);
  }, [faqsQuery.data, hydrateFromServer, userId]);

  useEffect(() => {
    if (!Array.isArray(ticketsQuery.data) || !userId) return;
    hydrateFromServer({ tickets: ticketsQuery.data }, userId);
  }, [hydrateFromServer, ticketsQuery.data, userId]);

  const lifecycle = useHelpSupportLifecycle({
    userId,
    authLoading,
    hydrated,
    queryError: faqsQuery.error || ticketsQuery.error || null,
    isFetching: faqsQuery.isFetching || ticketsQuery.isFetching,
    isFetched:
      faqsQuery.isFetched &&
      (userId ? ticketsQuery.isFetched || ticketsQuery.isSuccess : true),
    isSubmitting: mutations.isMutating,
    submitError: mutations.error,
  });

  useEffect(() => {
    setLifecycleStatus({
      lifecycleState: String(lifecycle.lifecycleState),
      lifecycleError: lifecycle.error,
      isSyncing:
        lifecycle.isSyncing || faqsQuery.isFetching || ticketsQuery.isFetching,
      isReady:
        lifecycle.isReady ||
        (hydrated &&
          faqsQuery.isFetched &&
          (!userId || ticketsQuery.isFetched || ticketsQuery.isSuccess)),
    });
  }, [
    faqsQuery.isFetched,
    faqsQuery.isFetching,
    hydrated,
    lifecycle.error,
    lifecycle.isReady,
    lifecycle.isSyncing,
    lifecycle.lifecycleState,
    setLifecycleStatus,
    ticketsQuery.isFetched,
    ticketsQuery.isFetching,
    ticketsQuery.isSuccess,
    userId,
  ]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: helpSupportQueryKeys.faqs(),
      exact: true,
    });
    if (userId) {
      await queryClient.invalidateQueries({
        queryKey: helpSupportQueryKeys.tickets(userId),
        exact: true,
      });
    }
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: helpSupportQueryKeys.faqs(),
        exact: true,
      }),
      userId
        ? queryClient.refetchQueries({
            queryKey: helpSupportQueryKeys.tickets(userId),
            exact: true,
          })
        : Promise.resolve(),
    ]);
  }, [queryClient, userId]);

  const submitTicket = useCallback(
    async ({ subject, message }) =>
      mutations.createTicket({
        subject,
        message,
      }),
    [mutations],
  );

  const safeTickets = useMemo(() => {
    if (!userId) return [];
    if (ownerUserId && ownerUserId !== userId) return [];
    return tickets;
  }, [ownerUserId, tickets, userId]);

  const loading =
    !hydrated ||
    (faqsQuery.isLoading && faqs.length === 0) ||
    (Boolean(userId) && ticketsQuery.isLoading && safeTickets.length === 0);
  const isRefreshing =
    hydrated &&
    (faqsQuery.isRefetching || (Boolean(userId) && ticketsQuery.isRefetching));
  const error = mutations.error?.message || lifecycleError || null;

  return {
    faqs,
    tickets: safeTickets,
    loading,
    isRefreshing,
    error,
    submitTicket,
    refresh,
    refetch: refresh,
    isSubmitting: mutations.isMutating,
    isReady,
    retry: lifecycle.retry,
  };
}

export default useHelpSupportFacade;
