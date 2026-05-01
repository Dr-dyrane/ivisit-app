import { useQuery } from "@tanstack/react-query";
import { helpSupportService } from "../../services/helpSupportService";
import { helpSupportQueryKeys } from "./helpSupport.queryKeys";

export function useSupportTicketsQuery({ userId, enabled = true }) {
  return useQuery({
    queryKey: helpSupportQueryKeys.tickets(userId),
    queryFn: async () => helpSupportService.listMyTickets({ userId }),
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export default useSupportTicketsQuery;
