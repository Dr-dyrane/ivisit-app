// screens/VisitsScreen.jsx
//
// PULLBACK NOTE: Pass 12 F4a - Legacy visits screen demoted to compatibility bridge
// OLD: full-screen list with VisitCard, VisitFilters, gradient header, FAB
// NEW: thin redirect bridge to the canonical home/map entry.
//
// Per MAP_VISITS_SYSTEM_AUDIT_V1 + VISITS_REQUEST_HISTORY_PLAN:
//   - route entry is still allowed (compatibility)
//   - route owner must not re-own map sheet state
//   - no divergent business logic
//
// Users access grouped history via Mini Profile -> History on /map.

import { Redirect } from "expo-router";

export default function VisitsScreen() {
  return <Redirect href="/(user)" />;
}
