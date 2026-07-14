export const bookVisitQueryKeys = {
  all: ["bookVisit"],
  facilitiesRoot: ["bookVisit", "facilities"],
  facilities: ({ specialty, search }) => [
    "bookVisit",
    "facilities",
    specialty || "all",
    search || "",
  ],
  specialties: ["bookVisit", "specialties"],
  facility: (hospitalId) => [
    "bookVisit",
    "facility",
    hospitalId || "none",
  ],
  quote: ({ userId, type, hospitalId }) => [
    "bookVisit",
    userId || "anonymous",
    "quote",
    type || "unknown",
    hospitalId || "none",
  ],
};

export default bookVisitQueryKeys;
