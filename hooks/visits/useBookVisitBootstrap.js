import { useEffect, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  hydrateBookVisitStore,
  useBookVisitStore,
} from "../../stores/bookVisitStore";
import { useBookVisitLifecycle } from "./useBookVisitLifecycle";

const safeParseParam = (value) => {
  const source = Array.isArray(value) ? value[0] : value;
  if (!source) return null;
  if (typeof source === "object") return source;
  try {
    return JSON.parse(source);
  } catch (_error) {
    return source;
  }
};

const toTrimmedString = (value) => {
  const source = Array.isArray(value) ? value[0] : value;
  if (typeof source !== "string") return null;
  const trimmed = source.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildRouteSeedSignature = (params = {}) => {
  const payload = {
    type: toTrimmedString(params?.type),
    specialty: toTrimmedString(params?.specialty),
    hospital: safeParseParam(params?.hospital),
    doctor: safeParseParam(params?.doctor),
    date: toTrimmedString(params?.date),
    time: toTrimmedString(params?.time),
    notes: toTrimmedString(params?.notes),
    step: toTrimmedString(params?.step),
  };
  const hasMeaningfulValue = Object.values(payload).some(
    (value) => value !== null && value !== undefined,
  );
  return hasMeaningfulValue ? JSON.stringify(payload) : null;
};

const buildDraftFromParams = (params = {}) => ({
  type: toTrimmedString(params?.type),
  specialty: toTrimmedString(params?.specialty),
  hospital: safeParseParam(params?.hospital),
  doctor: safeParseParam(params?.doctor),
  date: toTrimmedString(params?.date),
  time: toTrimmedString(params?.time),
  notes: toTrimmedString(params?.notes) || "",
});

// PULLBACK NOTE: Book visit bootstrap host.
// Owns: store hydration, auth ownership reset, route seeding, quote-store sync,
// and lifecycle/status bridge. The screen model stays focused on UI derivation
// and user-triggered handlers.

export function useBookVisitBootstrap({
  userId,
  quoteData,
  shouldFetchQuote,
  isQuoteFetching,
  quoteError,
  hasQuote,
  isSubmitting,
  submitError,
}) {
  const params = useLocalSearchParams();
  const hydrated = useBookVisitStore((state) => state.hydrated);
  const ownerUserId = useBookVisitStore((state) => state.ownerUserId);
  const routeSeedSignature = useBookVisitStore(
    (state) => state.routeSeedSignature,
  );
  const seedFromParams = useBookVisitStore((state) => state.seedFromParams);
  const setQuote = useBookVisitStore((state) => state.setQuote);
  const setLifecycleStatus = useBookVisitStore(
    (state) => state.setLifecycleStatus,
  );
  const markHydrated = useBookVisitStore((state) => state.markHydrated);
  const resetBookVisitState = useBookVisitStore(
    (state) => state.resetBookVisitState,
  );

  const routeSignature = useMemo(
    () => buildRouteSeedSignature(params),
    [params],
  );

  useEffect(() => {
    void hydrateBookVisitStore();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!userId) {
      if (ownerUserId) {
        resetBookVisitState(null);
      }
      return;
    }

    if (ownerUserId && ownerUserId !== userId) {
      resetBookVisitState(userId);
      return;
    }

    if (!ownerUserId) {
      markHydrated(userId);
    }
  }, [hydrated, markHydrated, ownerUserId, resetBookVisitState, userId]);

  useEffect(() => {
    if (!hydrated || !routeSignature || routeSignature === routeSeedSignature) {
      return;
    }
    seedFromParams(buildDraftFromParams(params), routeSignature);
  }, [hydrated, params, routeSeedSignature, routeSignature, seedFromParams]);

  useEffect(() => {
    if (quoteData) {
      setQuote(quoteData);
    }
  }, [quoteData, setQuote]);

  const lifecycle = useBookVisitLifecycle({
    hydrated,
    shouldFetchQuote,
    quoteError,
    isQuoteFetching,
    hasQuote,
    isSubmitting,
    submitError,
  });

  useEffect(() => {
    setLifecycleStatus({
      lifecycleState: String(lifecycle.lifecycleState),
      lifecycleError: lifecycle.error,
    });
  }, [lifecycle.error, lifecycle.lifecycleState, setLifecycleStatus]);

  return {
    hydrated,
    lifecycle,
  };
}

export default useBookVisitBootstrap;
