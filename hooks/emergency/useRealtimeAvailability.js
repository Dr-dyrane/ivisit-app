import { useEffect, useRef, useCallback, useState } from 'react';
import { realtimeAvailabilityService } from '../../services/realtimeAvailabilityService';

export const useRealtimeAvailability = (options = {}) => {
  const {
    hospitalId = null,
    bounds = null,
    autoStart = true,
    pollingInterval = 30000,
  } = options;

  const [availability, setAvailability] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const unsubscribeRef = useRef(null);

  // Handle availability updates
  const handleAvailabilityUpdate = useCallback((data) => {
    setAvailability(data);
    setLastUpdate(new Date());
    console.log('Availability updated:', data);
  }, []);

  // Subscribe to specific hospital
  const subscribeToHospital = useCallback((id) => {
    if (!id) return;

    unsubscribeRef.current = realtimeAvailabilityService.subscribeToHospital(
      id,
      handleAvailabilityUpdate
    );
    setIsConnected(true);
  }, [handleAvailabilityUpdate]);

  // Subscribe to geographic area
  const subscribeToArea = useCallback((areaBounds) => {
    if (!areaBounds) return;

    unsubscribeRef.current = realtimeAvailabilityService.subscribeToArea(
      areaBounds,
      handleAvailabilityUpdate
    );
    setIsConnected(true);
  }, [handleAvailabilityUpdate]);

  // Manual availability update
  const updateAvailability = useCallback(async (hospitalId, updates) => {
    const success = await realtimeAvailabilityService.updateAvailability(
      hospitalId,
      updates
    );
    return success;
  }, []);

  // Get current availability
  const getCurrentAvailability = useCallback(async () => {
    const data = await realtimeAvailabilityService.getCurrentAvailability();
    return data;
  }, []);

  // Initialize subscriptions
  useEffect(() => {
    if (!autoStart) return;

    if (hospitalId) {
      subscribeToHospital(hospitalId);
    } else if (bounds) {
      subscribeToArea(bounds);
    }

    // Start polling as fallback
    realtimeAvailabilityService.startPolling(pollingInterval);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      realtimeAvailabilityService.stopPolling();
    };
  }, [hospitalId, bounds, autoStart, pollingInterval, subscribeToHospital, subscribeToArea]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    availability,
    isConnected,
    lastUpdate,
    subscribeToHospital,
    subscribeToArea,
    updateAvailability,
    getCurrentAvailability,
  };
};

export default useRealtimeAvailability;
