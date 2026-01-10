import { useState, useEffect, useCallback } from "react";
import { ambulanceService } from "../../services/ambulanceService";
import { supabase } from "../../services/supabase";

export function useAmbulances() {
    const [ambulances, setAmbulances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAmbulances = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await ambulanceService.list();
            setAmbulances(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAmbulances();

        // Subscribe to real-time updates
        const subscription = supabase
            .channel('ambulances_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ambulances' },
                () => fetchAmbulances() // Simple refresh on change
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchAmbulances]);

    return {
        ambulances,
        isLoading,
        refetch: fetchAmbulances
    };
}
