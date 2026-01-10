import { useState, useEffect, useCallback } from "react";
import { visitsService } from "../../services/visitsService";
import { supabase } from "../../services/supabase";

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
            console.log('[useVisitsData] Fetched visits:', data.length, 'items');
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
            console.log('[useVisitsData] Adding visit:', visit.id, visit.hospital);
            const newItem = await visitsService.create(visit);
            console.log('[useVisitsData] Visit added successfully:', newItem.id, newItem.status);
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
            setVisits(prev => prev.map(v => v.id === id ? updated : v));
            return updated;
        } catch (err) {
            console.error("useVisitsData update error:", err);
            throw err;
        }
    }, []);

    const cancelVisit = useCallback(async (id) => {
        try {
            const updated = await visitsService.cancel(id);
            setVisits(prev => prev.map(v => v.id === id ? updated : v));
            return updated;
        } catch (err) {
            console.error("useVisitsData cancel error:", err);
            throw err;
        }
    }, []);

    const completeVisit = useCallback(async (id) => {
        try {
            console.log('[useVisitsData] Completing visit:', id);
            const updated = await visitsService.complete(id);
            console.log('[useVisitsData] Visit completed:', updated.id, 'status:', updated.status);
            setVisits(prev => prev.map(v => v.id === id ? updated : v));
            return updated;
        } catch (err) {
            console.error("[useVisitsData] complete error for", id, ":", err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchVisits();
    }, []);

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
                        console.log('[useVisitsData] Real-time update:', payload.eventType, payload.new?.id);
                        fetchVisits();
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, [fetchVisits]);

    return {
        visits,
        isLoading,
        error,
        refetch: fetchVisits,
        addVisit,
        updateVisit,
        cancelVisit,
        completeVisit
    };
}
