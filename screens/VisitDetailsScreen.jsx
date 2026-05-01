// screens/VisitDetailsScreen.jsx
//
// PULLBACK NOTE: Pass 12 F4b - Legacy visit-details screen demoted to compatibility bridge
// OLD: full-screen detail view; cancel was Alert-only (weak-point per VISITS_REQUEST_HISTORY_PLAN section 11)
// NEW: thin redirect bridge; canonical visit details now live in MapVisitDetailsModal on /map
//
// The legacy Alert-only cancel weakness is resolved by F4c: the map-owned modal uses the
// real cancelVisit() path from useVisits(), inherited via the same VisitsContext.
//
// Users reach visit details by tapping a row in MapRecentVisitsModal (grouped history).

import { Redirect, useLocalSearchParams } from "expo-router";

export default function VisitDetailsScreen() {
  const params = useLocalSearchParams();
  const rawId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : null;

  if (!rawId) {
    return <Redirect href="/(user)" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/(user)",
        params: {
          mapSheet: "visit_detail",
          visitKey: String(rawId),
        },
      }}
    />
  );
}
