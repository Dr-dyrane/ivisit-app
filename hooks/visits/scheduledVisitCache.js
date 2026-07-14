export const upsertScheduledVisit = (current, visit) => {
  if (!Array.isArray(current)) return [visit];
  const next = current.filter(
    (item) => String(item?.id || "") !== String(visit?.id || ""),
  );
  return [visit, ...next];
};

export const primeScheduledVisitCache = ({
  queryClient,
  visit,
  userId,
  normalizeVisit,
  detailKey,
  listKey,
}) => {
  if (!visit?.id || !queryClient || typeof normalizeVisit !== "function") return null;
  const normalizedVisit = normalizeVisit(visit);
  queryClient.setQueryData(detailKey, normalizedVisit);
  if (userId && listKey) {
    queryClient.setQueryData(listKey, (current) => (
      upsertScheduledVisit(current, normalizedVisit)
    ));
  }
  return normalizedVisit;
};
