export const VISIT_DETAIL_ROUTE_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  NOT_FOUND: "not_found",
  DENIED: "denied",
  ERROR: "error",
});

const DENIED_CODES = new Set(["401", "403", "42501", "PGRST301"]);

export const isVisitDetailAccessError = (error) => {
  const code = String(error?.code || error?.status || "").toUpperCase();
  const message = String(error?.message || error || "").toLowerCase();
  return DENIED_CODES.has(code)
    || message.includes("permission denied")
    || message.includes("row-level security")
    || message.includes("not authorized")
    || message.includes("unauthorized")
    || message.includes("forbidden")
    || message.includes("jwt");
};

export const resolveVisitDetailRouteState = ({
  enabled,
  hasUser,
  data,
  error,
  isLoading,
  isFetching,
}) => {
  if (!enabled) return { status: VISIT_DETAIL_ROUTE_STATUS.IDLE };
  if (!hasUser || isLoading || (isFetching && !data)) {
    return {
      status: VISIT_DETAIL_ROUTE_STATUS.LOADING,
      title: "Loading visit",
      message: "Checking the latest visit details.",
    };
  }
  if (error) {
    if (isVisitDetailAccessError(error)) {
      return {
        status: VISIT_DETAIL_ROUTE_STATUS.DENIED,
        title: "Visit unavailable",
        message: "This visit is not available for this account.",
      };
    }
    return {
      status: VISIT_DETAIL_ROUTE_STATUS.ERROR,
      title: "Could not load visit",
      message: "Check your connection and try again.",
    };
  }
  if (!data) {
    return {
      status: VISIT_DETAIL_ROUTE_STATUS.NOT_FOUND,
      title: "Visit not found",
      message: "It may have been removed or may not be available for this account.",
    };
  }
  return { status: VISIT_DETAIL_ROUTE_STATUS.READY };
};
