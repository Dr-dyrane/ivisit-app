import { useQuery } from "@tanstack/react-query";
import { helpSupportService } from "../../services/helpSupportService";
import { helpSupportQueryKeys } from "./helpSupport.queryKeys";

export function useSupportFaqsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: helpSupportQueryKeys.faqs(),
    queryFn: async () => helpSupportService.listFAQs(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export default useSupportFaqsQuery;
