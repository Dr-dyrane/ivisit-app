import { VISIT_STATUS } from "../constants/visits";
import { normalizeVisit, normalizeVisitsList } from "../utils/domainNormalize";

export const EMPTY_VISITS = [];

export const buildVisitKeySet = (...values) => {
  const keys = new Set();
  values
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim().length > 0,
    )
    .forEach((value) => {
      keys.add(String(value));
    });
  return keys;
};

export const visitMatchesAnyKey = (visit, keySet) => {
  if (!visit || !(keySet instanceof Set) || keySet.size === 0) return false;
  return (
    keySet.has(String(visit?.id || "")) ||
    keySet.has(String(visit?.requestId || "")) ||
    keySet.has(String(visit?.displayId || ""))
  );
};

export const selectVisits = (state) =>
  Array.isArray(state?.visits) ? state.visits : EMPTY_VISITS;

export const selectVisitByAnyKey = (state, key) => {
  const keySet = buildVisitKeySet(key);
  if (keySet.size === 0) return null;
  return (
    selectVisits(state).find((visit) => visitMatchesAnyKey(visit, keySet)) ||
    null
  );
};

export const selectVisitsStats = (state) => {
  const visits = selectVisits(state);
  return {
    total: visits.length,
    upcoming: visits.filter((visit) => visit.status === VISIT_STATUS.UPCOMING)
      .length,
    completed: visits.filter((visit) => visit.status === VISIT_STATUS.COMPLETED)
      .length,
    cancelled: visits.filter((visit) => visit.status === VISIT_STATUS.CANCELLED)
      .length,
    inProgress: visits.filter(
      (visit) => visit.status === VISIT_STATUS.IN_PROGRESS,
    ).length,
  };
};

export const mergeVisitByKey = (currentVisits = [], key, nextVisit) => {
  const normalizedNextVisit = normalizeVisit(nextVisit);
  if (!normalizedNextVisit) return normalizeVisitsList(currentVisits);

  const keySet = buildVisitKeySet(
    key,
    normalizedNextVisit.id,
    normalizedNextVisit.requestId,
    normalizedNextVisit.displayId,
  );

  return normalizeVisitsList(
    (Array.isArray(currentVisits) ? currentVisits : []).map((visit) =>
      visitMatchesAnyKey(visit, keySet) ? normalizedNextVisit : visit,
    ),
  );
};

export const removeVisitByAnyKey = (currentVisits = [], key) => {
  const keySet = buildVisitKeySet(key);
  if (keySet.size === 0) {
    return normalizeVisitsList(currentVisits);
  }

  return normalizeVisitsList(
    (Array.isArray(currentVisits) ? currentVisits : []).filter(
      (visit) => !visitMatchesAnyKey(visit, keySet),
    ),
  );
};

export default selectVisits;
