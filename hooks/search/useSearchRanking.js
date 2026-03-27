import { useMemo, useCallback } from "react";
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
 * Custom Hook: Search Ranking Logic
 * 
 * Centralizes the logic for:
 * 1. Filtering and scoring hospitals, visits, and notifications.
 * 2. Handling navigation actions for each result type.
 * 3. Managing "Bed Query" detection.
 */
export const useSearchRanking = () => {
    const router = useRouter();
    
    // Context Consumption
    const { updateSearch } = useEmergencyUI();
    const { allHospitals, setMode, selectedSpecialty } = useEmergency();
    const { query, commitQuery } = useSearch();
    const { visits } = useVisits();
    const { notifications } = useNotifications();

    const q = useMemo(
        () => (typeof query === "string" ? query.trim().toLowerCase() : ""),
        [query]
    );

    const isBedQuery = useMemo(() => isBedRelatedQuery(query), [query]);

    // --- Navigation Helpers ---

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
        [commitQuery, isBedQuery, router, setMode, updateSearch, selectedSpecialty]
    );

    const openNotificationsFiltered = useCallback(
        (filter) => {
            Haptics.selectionAsync();
            navigateToNotifications({ router, filter, method: "replace" });
        },
        [router]
    );

    const openVisitsFiltered = useCallback(
        (filter) => {
            Haptics.selectionAsync();
            navigateToVisits({ router, filter, method: "replace" });
        },
        [router]
    );

    // --- Ranking Logic ---

    const rankedResults = useMemo(() => {
        if (!q) return [];

        const results = [];

        // 1. Static Keywords
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

        // 2. Visits
        if (Array.isArray(visits)) {
            for (const v of visits) {
                const id = v?.id ? String(v.id) : null;
                if (!id) continue;
                const title = String(v?.hospital ?? "Visit");
                const hay = [
                    v?.hospital,
                    v?.doctor,
                    v?.specialty,
                    v?.type,
                    v?.status,
                    v?.date,
                    v?.time,
                ]
                    .filter(Boolean)
                    .join(" ");
                const score = scoreText(q, title) + scoreText(q, hay) + 30;
                if (score <= 0) continue;
                results.push({
                    key: `visit_${id}`,
                    title,
                    subtitle: [v?.specialty, v?.date, v?.time]
                        .filter(Boolean)
                        .join(" • "),
                    icon: "calendar-outline",
                    score,
                    onPress: () =>
                        navigateToVisitDetails({ router, visitId: id, method: "replace" }),
                });
            }
        }

        // 3. Hospitals
        const hospitals = Array.isArray(allHospitals) ? allHospitals : [];
        for (const h of hospitals) {
            const id = h?.id ? String(h.id) : null;
            if (!id) continue;
            const name = String(h?.name ?? "");
            const specialties = Array.isArray(h?.specialties)
                ? h.specialties.join(" ")
                : "";
            const hay = [name, h?.address, specialties].filter(Boolean).join(" ");
            const score = scoreText(q, name) + scoreText(q, hay) + 40;
            if (score <= 0) continue;
            results.push({
                key: `hospital_${id}`,
                title: name || "Hospital",
                subtitle: [h?.distance, h?.eta].filter(Boolean).join(" • "),
                icon: "business-outline",
                score,
                onPress: () => openHospitalInSOS(name),
            });
        }

        // 4. Notifications
        if (Array.isArray(notifications)) {
            for (const n of notifications) {
                const id = n?.id ? String(n.id) : null;
                if (!id) continue;
                const title = String(n?.title ?? "Notification");
                const hay = [n?.title, n?.message, n?.type].filter(Boolean).join(" ");
                const score = scoreText(q, title) + scoreText(q, hay) + 20;
                if (score <= 0) continue;

                const type = n?.type ?? null;
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
                    subtitle: String(n?.message ?? ""),
                    icon: "notifications-outline",
                    score,
                    onPress: () => {
                        const actionType = n?.actionType ?? null;
                        const actionData = n?.actionData ?? {};
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

        return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 18);
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
        isBedQuery
    };
};
