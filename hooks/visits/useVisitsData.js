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
            const updated = await visitsService.complete(id);
            setVisits(prev => prev.map(v => v.id === id ? updated : v));
            return updated;
        } catch (err) {
            console.error("[useVisitsData] complete error for", id, ":", err);
            throw err;
        }
    }, []);

    const deleteVisit = useCallback(async (id) => {
        try {
            await visitsService.delete(id);
            setVisits(prev => prev.filter(v => v.id !== id));
        } catch (err) {
            console.error("[useVisitsData] delete error for", id, ":", err);
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
                        if (payload.eventType === 'INSERT') {
                            const newVisit = payload.new;
                            setVisits(prev => [newVisit, ...prev]);
                        } 
                        else if (payload.eventType === 'UPDATE') {
                            const updatedVisit = payload.new;
                            setVisits(prev => 
                                prev.map(v => v.id === updatedVisit.id ? updatedVisit : v)
                            );
                        } 
                        else if (payload.eventType === 'DELETE') {
                            const deletedId = payload.old.id;
                            setVisits(prev => prev.filter(v => v.id !== deletedId));
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
