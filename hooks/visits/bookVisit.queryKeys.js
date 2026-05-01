export const bookVisitQueryKeys = {
  all: ["bookVisit"],
  quote: ({ userId, type, hospitalId }) => [
    "bookVisit",
    userId || "anonymous",
    "quote",
    type || "unknown",
    hospitalId || "none",
  ],
};

export default bookVisitQueryKeys;
