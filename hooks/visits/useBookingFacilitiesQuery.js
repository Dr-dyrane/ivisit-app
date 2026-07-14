import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { hospitalsService } from "../../services/hospitalsService";
import { bookVisitQueryKeys } from "./bookVisit.queryKeys";

const PAGE_SIZE = 20;

export function useBookingFacilitiesQuery({
  specialty,
  search = "",
  enabled = true,
}) {
  return useInfiniteQuery({
    queryKey: bookVisitQueryKeys.facilities({ specialty, search }),
    queryFn: ({ pageParam = 0 }) =>
      hospitalsService.listBookingFacilities({
        specialty,
        search,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore ? Number(lastPage.page || 0) + 1 : undefined,
    enabled: enabled && Boolean(specialty),
    staleTime: 60 * 1000,
    refetchOnReconnect: true,
  });
}

export function useBookingSpecialtiesQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: bookVisitQueryKeys.specialties,
    queryFn: () => hospitalsService.listBookingSpecialties(),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: true,
  });
}

export function useBookingFacilityQuery({ hospitalId, enabled = true }) {
  return useQuery({
    queryKey: bookVisitQueryKeys.facility(hospitalId),
    queryFn: () => hospitalsService.getBookingFacilityById(hospitalId),
    enabled: enabled && Boolean(hospitalId),
    staleTime: 60 * 1000,
  });
}

export default useBookingFacilitiesQuery;
