import { supabase } from '../lib/supabase';

class RealtimeAvailabilityService {
  constructor() {
    this.subscriptions = new Map();
    this.pollingIntervals = new Map();
    this.isPolling = false;
  }

  /**
   * Subscribe to real-time availability updates for a specific hospital
   * @param {string} hospitalId - Hospital ID to watch
   * @param {function} callback - Callback function for updates
   * @returns {function} Unsubscribe function
   */
  subscribeToHospital(hospitalId, callback) {
    if (!hospitalId || typeof callback !== 'function') {
      console.warn('RealtimeAvailabilityService: Invalid parameters');
      return () => {};
    }

    // Subscribe to Supabase real-time updates
    const subscription = supabase
      .channel(`hospital-${hospitalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hospitals',
          filter: `id=eq.${hospitalId}`
        },
        (payload) => {
          console.log('Realtime availability update:', payload);
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time updates for hospital ${hospitalId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to hospital ${hospitalId}`);
        }
      });

    this.subscriptions.set(hospitalId, subscription);

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(hospitalId);
    };
  }

  /**
   * Subscribe to availability updates for all hospitals in an area
   * @param {object} bounds - Geographic bounds {north, south, east, west}
   * @param {function} callback - Callback function for updates
   * @returns {function} Unsubscribe function
   */
  subscribeToArea(bounds, callback) {
    const { north, south, east, west } = bounds;
    
    const subscription = supabase
      .channel('area-availability')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hospitals'
        },
        (payload) => {
          // Check if updated hospital is within bounds
          const hospital = payload.new;
          if (
            hospital.latitude >= south &&
            hospital.latitude <= north &&
            hospital.longitude >= west &&
            hospital.longitude <= east
          ) {
            callback(hospital);
          }
        }
      )
      .subscribe();

    const unsubscribeId = `area-${Date.now()}`;
    this.subscriptions.set(unsubscribeId, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(unsubscribeId);
    };
  }

  /**
   * Start polling for availability updates (fallback for when real-time fails)
   * @param {number} interval - Polling interval in milliseconds (default: 30000)
   */
  startPolling(interval = 30000) {
    if (this.isPolling) {
      console.warn('RealtimeAvailabilityService: Polling already started');
      return;
    }

    this.isPolling = true;
    console.log(`Starting availability polling every ${interval}ms`);

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('available_hospitals')
          .select('*')
          .order('last_availability_update', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        // Emit updates to all subscribers
        this.subscriptions.forEach((subscription, key) => {
          if (key.startsWith('area-') && typeof subscription.callback === 'function') {
            subscription.callback(data);
          }
        });

      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);

    this.pollingIntervals.set('global', pollInterval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    const pollInterval = this.pollingIntervals.get('global');
    if (pollInterval) {
      clearInterval(pollInterval);
      this.pollingIntervals.delete('global');
      this.isPolling = false;
      console.log('Stopped availability polling');
    }
  }

  /**
   * Update hospital availability
   * @param {string} hospitalId - Hospital ID
   * @param {object} updates - Availability updates
   * @returns {Promise<boolean>} Success status
   */
  async updateAvailability(hospitalId, updates) {
    try {
      const { error } = await supabase.rpc('update_hospital_availability', {
        hospital_id: hospitalId,
        ...updates
      });

      if (error) {
        console.error('Update availability error:', error);
        return false;
      }

      console.log(`Updated availability for hospital ${hospitalId}`);
      return true;
    } catch (error) {
      console.error('Update availability error:', error);
      return false;
    }
  }

  /**
   * Get current availability for all hospitals
   * @returns {Promise<Array>} Array of available hospitals
   */
  async getCurrentAvailability() {
    try {
      const { data, error } = await supabase
        .from('available_hospitals')
        .select('*')
        .order('last_availability_update', { ascending: false });

      if (error) {
        console.error('Get availability error:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Get availability error:', error);
      return [];
    }
  }

  /**
   * Cleanup all subscriptions and polling
   */
  cleanup() {
    // Unsubscribe from all real-time subscriptions
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();

    // Stop polling
    this.stopPolling();

    console.log('RealtimeAvailabilityService: Cleanup complete');
  }
}

// Export singleton instance
export const realtimeAvailabilityService = new RealtimeAvailabilityService();
export default realtimeAvailabilityService;
