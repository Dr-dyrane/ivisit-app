import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  helpSupportService,
  normalizeSupportTicket,
} from "../../services/helpSupportService";
import { useHelpSupportStore } from "../../stores/helpSupportStore";
import { helpSupportQueryKeys } from "./helpSupport.queryKeys";

const buildOptimisticTicket = (input = {}, userId = null) =>
  normalizeSupportTicket({
    id: `optimistic_${Date.now()}`,
    user_id: userId,
    subject: input?.subject ?? "Support request",
    message: input?.message ?? "",
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

export function useSupportTicketMutations({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = helpSupportQueryKeys.tickets(userId);
  const incrementMutationCount = useHelpSupportStore(
    (state) => state.incrementMutationCount,
  );
  const decrementMutationCount = useHelpSupportStore(
    (state) => state.decrementMutationCount,
  );

  const createMutation = useMutation({
    mutationFn: (ticket) =>
      helpSupportService.createTicket({ ...ticket, userId }),
    onMutate: async (ticket) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousTickets = queryClient.getQueryData(queryKey) || [];
      const optimisticTicket = buildOptimisticTicket(ticket, userId);
      queryClient.setQueryData(queryKey, (current = []) => [
        optimisticTicket,
        ...(Array.isArray(current) ? current : []),
      ]);
      return { previousTickets };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(queryKey, context.previousTickets);
      }
    },
    onSuccess: (createdTicket) => {
      queryClient.setQueryData(queryKey, (current = []) => {
        const next = (Array.isArray(current) ? current : []).filter(
          (ticket) => !String(ticket?.id || "").startsWith("optimistic_"),
        );
        return [createdTicket, ...next];
      });
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createTicket = useCallback(
    (ticket) => createMutation.mutateAsync(ticket),
    [createMutation],
  );

  return useMemo(
    () => ({
      createTicket,
      isMutating: createMutation.isPending,
      error: createMutation.error || null,
    }),
    [createMutation.error, createMutation.isPending, createTicket],
  );
}

export default useSupportTicketMutations;
