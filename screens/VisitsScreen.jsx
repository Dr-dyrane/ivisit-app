// screens/VisitsScreen.jsx
//
// PULLBACK NOTE: Pass 12 F4a - Legacy visits screen demoted to compatibility bridge
// OLD: full-screen list with VisitCard, VisitFilters, gradient header, FAB
// NEW: thin redirect bridge; canonical history now lives in MapHistoryModal on /map
//
// Per MAP_VISITS_SYSTEM_AUDIT_V1 + VISITS_REQUEST_HISTORY_PLAN:
//   - route entry is still allowed (compatibility)
//   - route owner hands off into canonical map-owned history
//   - no divergent business logic
//
// Users access grouped history via Mini Profile -> History on /map.

import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function VisitsScreen() {
const router = useRouter();

useEffect(() => {
router.replace("/(user)");
}, [router]);

return null;
}