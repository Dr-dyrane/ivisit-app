import { useState, useEffect, useCallback } from "react";
import { visitsService } from "../../services/visitsService";

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
        } catch (err) {
            console.error("useVisitsData fetch error:", err);
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
            console.error("useVisitsData add error:", err);
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
            console.error("useVisitsData complete error:", err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchVisits();
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
