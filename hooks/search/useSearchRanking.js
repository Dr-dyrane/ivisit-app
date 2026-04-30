import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useVisits } from "../../contexts/VisitsContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useEmergency, EmergencyMode } from "../../contexts/EmergencyContext";
import { useEmergencyUI } from "../../contexts/EmergencyUIContext";
import { useSearch } from "../../contexts/SearchContext";
import { scoreText, isBedRelatedQuery } from "../../utils/searchScoring";
import { discoveryService } from "../../services/discoveryService";
import { NOTIFICATION_TYPES } from "../../constants/notifications";
import {
  navigateToNotifications,
  navigateToSOS,
  navigateToVisitDetails,
  navigateToVisits,
} from "../../utils/navigationHelpers";

/**
 * Custom hook: Search ranking logic
 *
 * Centralizes the logic for:
 * 1. Filtering and scoring hospitals, visits, and notifications
 * 2. Handling navigation actions for each result type
 * 3. Managing bed-query detection
 */
export const useSearchRanking = () => {
  const router = useRouter();

  const { updateSearch } = useEmergencyUI();
  const { allHospitals, setMode, selectedSpecialty } = useEmergency();
  const { query, commitQuery } = useSearch();
  const { visits } = useVisits();
  const { notifications } = useNotifications();

  const q = useMemo(
    () => (typeof query === "string" ? query.trim().toLowerCase() : ""),
    [query],
  );

  const isBedQuery = useMemo(() => isBedRelatedQuery(query), [query]);

  const openHospitalInSOS = useCallback(
    (hospitalName) => {
      Haptics.selectionAsync();
      const name = typeof hospitalName === "string" ? hospitalName : "";
      commitQuery(name);
      discoveryService.trackSearchSelection({
        query: name,
        source: "search_screen",
        key: "hospital_result",
        extra: { isBedQuery },
      });
      navigateToSOS({
        router,
        setEmergencyMode: setMode,
        setEmergencySearch: updateSearch,
        searchQuery: name,
        mode:
          selectedSpecialty || isBedQuery
            ? EmergencyMode.BOOKING
            : EmergencyMode.EMERGENCY,
      });
    },
    [commitQuery, isBedQuery, router, selectedSpecialty, setMode, updateSearch],
  );

  const openNotificationsFiltered = useCallback(
    (filter) => {
      Haptics.selectionAsync();
      navigateToNotifications({ router, filter, method: "replace" });
    },
    [router],
  );

  const openVisitsFiltered = useCallback(
    (filter) => {
      Haptics.selectionAsync();
      navigateToVisits({ router, filter, method: "replace" });
    },
    [router],
  );

  const rankedResults = useMemo(() => {
    if (!q) return [];

    const results = [];

    if (q === "upcoming" || q.includes("upcoming")) {
      results.push({
        key: "visits_upcoming",
        title: "Upcoming visits",
        subtitle: "Open Visits filtered to upcoming",
        icon: "calendar-outline",
        score: 140,
        onPress: () => openVisitsFiltered("upcoming"),
      });
    }

    if (q === "completed" || q.includes("completed")) {
      results.push({
        key: "visits_completed",
        title: "Completed visits",
        subtitle: "Open Visits filtered to completed",
        icon: "checkmark-circle-outline",
        score: 140,
        onPress: () => openVisitsFiltered("completed"),
      });
    }

    if (q.includes("notification")) {
      results.push({
        key: "notifications_all",
        title: "Notifications",
        subtitle: "Open notifications inbox",
        icon: "notifications-outline",
        score: 120,
        onPress: () => openNotificationsFiltered("all"),
      });
    }

    if (Array.isArray(visits)) {
      for (const visit of visits) {
        const id = visit?.id ? String(visit.id) : null;
        if (!id) continue;

        const title = String(visit?.hospital ?? "Visit");
        const haystack = [
          visit?.hospital,
          visit?.doctor,
          visit?.specialty,
          visit?.type,
          visit?.status,
          visit?.date,
          visit?.time,
        ]
          .filter(Boolean)
          .join(" ");
        const score = scoreText(q, title) + scoreText(q, haystack) + 30;
        if (score <= 0) continue;

        results.push({
          key: `visit_${id}`,
          title,
          subtitle: [visit?.specialty, visit?.date, visit?.time]
            .filter(Boolean)
            .join(" / "),
          icon: "calendar-outline",
          score,
          onPress: () =>
            navigateToVisitDetails({ router, visitId: id, method: "replace" }),
        });
      }
    }

    const hospitals = Array.isArray(allHospitals) ? allHospitals : [];
    for (const hospital of hospitals) {
      const id = hospital?.id ? String(hospital.id) : null;
      if (!id) continue;

      const name = String(hospital?.name ?? "");
      const specialties = Array.isArray(hospital?.specialties)
        ? hospital.specialties.join(" ")
        : "";
      const haystack = [name, hospital?.address, specialties]
        .filter(Boolean)
        .join(" ");
      const score = scoreText(q, name) + scoreText(q, haystack) + 40;
      if (score <= 0) continue;

      results.push({
        key: `hospital_${id}`,
        title: name || "Hospital",
        subtitle: [hospital?.distance, hospital?.eta]
          .filter(Boolean)
          .join(" / "),
        icon: "business-outline",
        score,
        onPress: () => openHospitalInSOS(name),
      });
    }

    if (Array.isArray(notifications)) {
      for (const notification of notifications) {
        const id = notification?.id ? String(notification.id) : null;
        if (!id) continue;

        const title = String(notification?.title ?? "Notification");
        const haystack = [
          notification?.title,
          notification?.message,
          notification?.type,
        ]
          .filter(Boolean)
          .join(" ");
        const score = scoreText(q, title) + scoreText(q, haystack) + 20;
        if (score <= 0) continue;

        const type = notification?.type ?? null;
        const defaultFilter =
          type === NOTIFICATION_TYPES.EMERGENCY
            ? "emergency"
            : type === NOTIFICATION_TYPES.APPOINTMENT ||
                type === NOTIFICATION_TYPES.VISIT
              ? "appointments"
              : "all";

        results.push({
          key: `notification_${id}`,
          title,
          subtitle: String(notification?.message ?? ""),
          icon: "notifications-outline",
          score,
          onPress: () => {
            const actionType = notification?.actionType ?? null;
            const actionData = notification?.actionData ?? {};
            const visitId =
              typeof actionData?.visitId === "string"
                ? actionData.visitId
                : typeof actionData?.appointmentId === "string"
                  ? actionData.appointmentId
                  : null;

            if (actionType === "track") {
              navigateToSOS({
                router,
                setEmergencyMode: setMode,
                mode: EmergencyMode.EMERGENCY,
              });
              return;
            }

            if (actionType === "view_summary" && visitId) {
              navigateToVisitDetails({ router, visitId, method: "replace" });
              return;
            }

            if (actionType === "view_appointment" && visitId) {
              navigateToVisitDetails({ router, visitId, method: "replace" });
              return;
            }

            openNotificationsFiltered(defaultFilter);
          },
        });
      }
    }

    return results
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, 18);
  }, [
    allHospitals,
    isBedQuery,
    notifications,
    openHospitalInSOS,
    openNotificationsFiltered,
    openVisitsFiltered,
    q,
    router,
    setMode,
    visits,
  ]);

  return {
    rankedResults,
    isBedQuery,
  };
};
