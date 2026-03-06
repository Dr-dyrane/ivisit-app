import { useState, useEffect, useCallback } from "react";
import { visitsService } from "../../services/visitsService";
import { supabase } from "../../services/supabase";

const buildKeySet = (...values) => {
    const set = new Set();
    values
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
        .forEach((value) => set.add(String(value)));
    return set;
};

const visitMatchesKeys = (visit, keySet) => {
    if (!visit || keySet.size === 0) return false;
    return (
        keySet.has(String(visit.id)) ||
        keySet.has(String(visit.requestId || "")) ||
        keySet.has(String(visit.displayId || ""))
    );
};

const replaceVisitByKey = (prev, key, updated) => {
    if (!updated) return prev;
    const keySet = buildKeySet(key, updated.id, updated.requestId, updated.displayId);
    return prev.map((visit) => (visitMatchesKeys(visit, keySet) ? updated : visit));
};

/**
 * Hook to manage visits data
 * @returns {Object} { visits, isLoading, error, refetch, addVisit, updateVisit, cancelVisit, completeVisit }
 */
export function useVisitsData() {
    const [visits, setVisits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVisits = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await visitsService.list();
            setVisits(data);
            setError(null);
        } catch (err) {
            console.error("[useVisitsData] fetch error:", err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addVisit = useCallback(async (visit) => {
        try {
            const newItem = await visitsService.create(visit);
            setVisits(prev => [newItem, ...prev]);
            return newItem;
        } catch (err) {
            console.error("[useVisitsData] add error:", err);
            throw err;
        }
    }, []);

    const updateVisit = useCallback(async (id, updates) => {
        try {
            const updated = await visitsService.update(id, updates);
            setVisits((prev) => replaceVisitByKey(prev, id, updated));
            return updated;
        } catch (err) {
            if (err?.code === "PGRST204") {
                return null;
            }
            console.error("useVisitsData update error:", err);
            throw err;
        }
    }, []);

    const cancelVisit = useCallback(async (id) => {
        try {
            const updated = await visitsService.cancel(id);
            setVisits((prev) => replaceVisitByKey(prev, id, updated));
            return updated;
        } catch (err) {
            if (err?.code === "PGRST204") {
                return null;
            }
            console.error("useVisitsData cancel error:", err);
            throw err;
        }
    }, []);

    const completeVisit = useCallback(async (id) => {
        try {
            const updated = await visitsService.complete(id);
            setVisits((prev) => replaceVisitByKey(prev, id, updated));
            return updated;
        } catch (err) {
            if (err?.code === "PGRST204") {
                return null;
            }
            console.error("[useVisitsData] complete error for", id, ":", err);
            throw err;
        }
    }, []);

    const deleteVisit = useCallback(async (id) => {
        try {
            await visitsService.delete(id);
            const keySet = buildKeySet(id);
            setVisits((prev) => prev.filter((visit) => !visitMatchesKeys(visit, keySet)));
        } catch (err) {
            console.error("[useVisitsData] delete error for", id, ":", err);
            throw err;
        }
    }, []);

    // Only fetch when user is authenticated
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            fetchVisits();
        })();
        return () => { cancelled = true; };
    }, [fetchVisits]);

    useEffect(() => {
        let subscription;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            subscription = supabase
                .channel('visits_updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'visits',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        if (payload.eventType === 'INSERT') {
                            const newVisit = visitsService.fromDbRow(payload.new);
                            if (!newVisit) return;
                            setVisits(prev => [newVisit, ...prev]);
                        }
                        else if (payload.eventType === 'UPDATE') {
                            const updatedVisit = visitsService.fromDbRow(payload.new);
                            if (!updatedVisit) return;
                            setVisits((prev) => {
                                const keySet = buildKeySet(
                                    payload?.new?.id,
                                    payload?.new?.request_id,
                                    payload?.new?.display_id,
                                    updatedVisit?.id,
                                    updatedVisit?.requestId,
                                    updatedVisit?.displayId
                                );
                                const previousMatch = prev.find((visit) => visitMatchesKeys(visit, keySet)) || null;
                                const merged = {
                                    ...updatedVisit,
                                    hospital:
                                        updatedVisit?.hospital ||
                                        previousMatch?.hospital ||
                                        previousMatch?.hospitalName ||
                                        null,
                                    hospitalName:
                                        updatedVisit?.hospitalName ||
                                        previousMatch?.hospitalName ||
                                        previousMatch?.hospital ||
                                        null,
                                    image:
                                        updatedVisit?.image ||
                                        updatedVisit?.hospitalImage ||
                                        previousMatch?.image ||
                                        previousMatch?.hospitalImage ||
                                        null,
                                    hospitalImage:
                                        updatedVisit?.hospitalImage ||
                                        updatedVisit?.image ||
                                        previousMatch?.hospitalImage ||
                                        previousMatch?.image ||
                                        null,
                                };
                                return replaceVisitByKey(prev, payload?.new?.id || updatedVisit?.id, merged);
                            });
                        }
                        else if (payload.eventType === 'DELETE') {
                            const keySet = buildKeySet(
                                payload?.old?.id,
                                payload?.old?.request_id,
                                payload?.old?.display_id
                            );
                            setVisits(prev => prev.filter(v => !visitMatchesKeys(v, keySet)));
                        }
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);

    return {
        visits,
        isLoading,
        error,
        refetch: fetchVisits,
        addVisit,
        updateVisit,
        cancelVisit,
        completeVisit,
        deleteVisit
    };
}
